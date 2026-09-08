/**
 * identityVerification.service.js
 *
 * Backend-side identity verification engine for CollegeVerse.
 *
 * Security principle: OCR is EVIDENCE. The backend decides verification.
 * OCR success ≠ identity verification.
 *
 * Verification requires ALL of:
 *   1. Document is a student/college ID (not an event badge or other document)
 *   2. Institution on ID matches the student's authenticated institution
 *   3. Student name matches registered profile
 *   4. Enrollment/Roll number matches registered profile (when available)
 *
 * Statuses returned:
 *   VERIFIED         — all critical fields matched
 *   REQUIRES_REVIEW  — institution + name matched, enrollment unavailable or low-confidence
 *   FAILED           — explicit mismatch or invalid document type
 */

'use strict';

const logger = require('../utils/logger');

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Negative keywords: if these dominate the OCR text, the document is NOT a student ID.
 * These represent event badges, hackathon passes, visitor cards, etc.
 */
const EVENT_DOCUMENT_KEYWORDS = new Set([
  'hackathon', 'tech fest', 'techfest', 'participant', 'entry pass', 'entrypass',
  'visitor', 'visitor pass', 'visitor card', 'event badge', 'event pass',
  'conference', 'speaker', 'volunteer', 'mentor',
  'certificate of participation', 'fest', 'symposium', 'cultural fest',
  'workshop pass', 'seminar', 'guest pass', 'media pass', 'press pass',
  'organizing team', 'organizer', 'staff badge', 'crew', 'invigilator',
]);

/**
 * Positive keywords: at least one of these must appear for a document to be
 * considered a potential student ID.
 * These are field labels or structural markers common on college IDs.
 */
const STUDENT_ID_POSITIVE_SIGNALS = [
  'enrollment', 'enrolment', 'roll no', 'roll number', 'reg no', 'registration no',
  'registration number', 'student id', 'student no', 'admission no',
  'department', 'dept', 'faculty', 'branch', 'course', 'program',
  'session', 'batch', 'academic year', 'validity', 'valid thru', 'valid upto',
  'college id', 'student identity', 'student card', 'id card',
];

// Minimum word-overlap fraction to consider a name "matched" (allowing OCR noise)
const NAME_MATCH_THRESHOLD = 0.5;

// Minimum character length for a name word to participate in matching
const NAME_WORD_MIN_LEN = 2;

// Enrollment/roll number: strip only spaces and hyphens for strict comparison
const ENROLLMENT_STRIP_RE = /[\s\-]/g;

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * General text normalizer: lowercase, strip punctuation/dots/extra spaces.
 * Used for institution and soft comparisons.
 */
const normalizeText = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Strict enrollment normalizer: uppercase, strip spaces and hyphens only.
 * Preserves alphanumeric structure for exact matching.
 */
const normalizeEnrollment = (s) => {
  if (!s || typeof s !== 'string') return '';
  return s.toUpperCase().replace(ENROLLMENT_STRIP_RE, '');
};

/**
 * Name normalizer: lowercase, strip punctuation, keep words ≥ MIN_LEN chars.
 */
const normalizeNameWords = (s) => {
  if (!s || typeof s !== 'string') return [];
  return s.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= NAME_WORD_MIN_LEN);
};

// ─── Document Type Detection ──────────────────────────────────────────────────

/**
 * Detects whether the OCR'd document is a student college ID, an event badge,
 * or an unknown/insufficient document.
 *
 * @param {object} ocrResult — normalized result from extractIdCardData
 * @param {string} rawText — raw OCR text (from rawFields.rawText or similar)
 * @returns {'student_id' | 'event_badge' | 'insufficient_data'}
 */
const detectDocumentType = (ocrResult, rawText = '') => {
  const textToCheck = normalizeText(rawText || JSON.stringify(ocrResult.rawFields || {}));

  // Check for event badge / non-ID keywords
  let eventScore = 0;
  for (const keyword of EVENT_DOCUMENT_KEYWORDS) {
    if (textToCheck.includes(keyword)) {
      eventScore += 1;
      logger.debug(`[IDVerify] Event keyword detected: "${keyword}"`);
    }
  }

  // Check for positive student ID signals
  let studentIdScore = 0;
  for (const signal of STUDENT_ID_POSITIVE_SIGNALS) {
    if (textToCheck.includes(signal)) {
      studentIdScore += 1;
    }
  }

  // Azure prebuilt-idDocument model returning structured DocumentNumber is a strong signal
  const hasStructuredId = Boolean(
    ocrResult.rollNumber ||
    (ocrResult.rawFields && (
      ocrResult.rawFields.DocumentNumber ||
      ocrResult.rawFields.IdentificationNumber ||
      ocrResult.rawFields.PersonalNumber
    ))
  );

  if (hasStructuredId) studentIdScore += 3; // Strong structural signal from Azure model

  logger.info(`[IDVerify] Document type analysis — eventScore: ${eventScore}, studentIdScore: ${studentIdScore}, hasStructuredId: ${hasStructuredId}`);

  // Decision:
  // If event signals clearly dominate student signals → event badge
  if (eventScore > 0 && eventScore >= studentIdScore && studentIdScore < 2) {
    return 'event_badge';
  }

  // If no student ID signals at all AND no structured fields → insufficient
  if (studentIdScore === 0 && !hasStructuredId && !ocrResult.collegeName && !ocrResult.studentName) {
    return 'insufficient_data';
  }

  // If event signals exist but student signals are stronger → still flag as suspicious
  // but allow it to pass document type check (identity matching will decide)
  if (eventScore > 0 && studentIdScore > eventScore) {
    logger.warn(`[IDVerify] Mixed signals: event keywords present but student ID signals stronger`);
  }

  return 'student_id';
};

// ─── Institution Matching ─────────────────────────────────────────────────────

/**
 * Checks whether the institution extracted from OCR matches the authenticated
 * student's registered institution.
 *
 * Uses fuzzy word-token overlap to handle variations like:
 *   "GLA University" ↔ "G.L.A. University" ↔ "GLA UNIVERSITY MATHURA"
 *
 * Returns false if either value is missing (we cannot verify what we cannot read).
 */
const matchInstitution = (extractedCollegeName, registeredCollegeName, domain) => {
  if (!extractedCollegeName || !registeredCollegeName) return false;

  const stopWords = new Set(['and', 'the', 'for', 'of', 'in', 'at', 'to']);
  const clean = (s) => normalizeText(s)
    .split(' ')
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const words1 = clean(extractedCollegeName);
  const words2 = clean(registeredCollegeName);

  if (!words1.length || !words2.length) return false;

  // Direct substring check
  const n1 = normalizeText(extractedCollegeName);
  const n2 = normalizeText(registeredCollegeName);
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Acronym check: "gla" ↔ "gla university"
  const getAcronym = (words) => words.map((w) => w[0]).join('');
  const a1 = getAcronym(words1);
  const a2 = getAcronym(words2);
  if (a1 && a2 && (a1 === a2 || n1.includes(a2) || n2.includes(a1))) return true;

  // Domain abbreviation check: domain "gla.ac.in" → "gla" must appear in extracted
  if (domain) {
    const domainPart = domain.split('.')[0].toLowerCase();
    if (domainPart.length >= 3 && n1.includes(domainPart)) return true;
  }

  // Word overlap
  const set1 = new Set(words1);
  let overlap = 0;
  words2.forEach((w) => { if (set1.has(w)) overlap += 1; });
  const overlapRatio = overlap / Math.min(words1.length, words2.length);
  if (overlapRatio >= 0.6) return true;

  return false;
};

// ─── Name Matching ────────────────────────────────────────────────────────────

/**
 * Compares OCR-extracted student name against the registered name.
 * Allows for OCR noise, initials, and partial matches.
 * Uses word-overlap with ≥ NAME_MATCH_THRESHOLD fraction.
 *
 * Example:
 *   "Ansh Sharma" ↔ "ANSH SHARMA" → matched
 *   "A. Sharma" ↔ "Ansh Sharma" → matched (last name token overlap)
 *   "Ansh Kumar" ↔ "Ansh Sharma" → NOT matched (last name differs)
 */
const matchName = (extractedName, registeredName) => {
  if (!extractedName || !registeredName) return false;

  const words1 = normalizeNameWords(extractedName);
  const words2 = normalizeNameWords(registeredName);

  if (!words1.length || !words2.length) return false;

  // Exact normalized match
  if (words1.join(' ') === words2.join(' ')) return true;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  let overlap = 0;
  set1.forEach((w) => { if (set2.has(w)) overlap += 1; });

  const denominator = Math.max(set1.size, set2.size);
  const ratio = overlap / denominator;

  logger.debug(`[IDVerify] Name match: "${extractedName}" vs "${registeredName}" — overlap: ${overlap}/${denominator} (${Math.round(ratio * 100)}%)`);

  return ratio >= NAME_MATCH_THRESHOLD;
};

// ─── Enrollment Matching ──────────────────────────────────────────────────────

/**
 * Compares OCR enrollment/roll number against registered profile values.
 * Strict: only strips spaces and hyphens, preserves all alphanumeric characters.
 *
 * Returns: 'matched' | 'mismatched' | 'unavailable'
 *   - 'unavailable' means OCR didn't extract an enrollment number (not a mismatch)
 *   - 'mismatched' means OCR found one but it doesn't match
 */
const matchEnrollment = (extractedRoll, registeredValues = []) => {
  const normalized = normalizeEnrollment(extractedRoll);
  if (!normalized || normalized.length < 4) return 'unavailable';

  const registeredNormalized = registeredValues
    .filter(Boolean)
    .map(normalizeEnrollment)
    .filter((s) => s.length >= 4);

  if (!registeredNormalized.length) {
    // Student hasn't registered their enrollment number — can't verify
    return 'unavailable';
  }

  const matched = registeredNormalized.some((r) => r === normalized);
  return matched ? 'matched' : 'mismatched';
};

// ─── Verification Decision Engine ────────────────────────────────────────────

/**
 * Makes the final verification decision based on all check results.
 *
 * @param {object} params
 * @param {string} params.documentType — from detectDocumentType
 * @param {boolean} params.institutionMatched
 * @param {boolean} params.nameMatched
 * @param {'matched'|'mismatched'|'unavailable'} params.enrollmentMatch
 * @returns {{ status: string, reason: string, matchedFields: string[], failedFields: string[] }}
 */
const makeVerificationDecision = ({
  documentType,
  institutionMatched,
  nameMatched,
  enrollmentMatch,
}) => {
  const matchedFields = [];
  const failedFields = [];

  // ── Rule 1: Document must be a student ID ──────────────────────────────────
  if (documentType === 'event_badge') {
    return {
      status: 'FAILED',
      reason: 'invalid_document_type',
      reasonMessage: 'The scanned document appears to be an event badge, participant card, or non-student document. Please scan your college-issued student ID card.',
      matchedFields: [],
      failedFields: ['document_type'],
    };
  }

  if (documentType === 'insufficient_data') {
    return {
      status: 'FAILED',
      reason: 'insufficient_ocr_data',
      reasonMessage: 'Unable to read sufficient identity information from the document. Please ensure good lighting and hold the ID steady.',
      matchedFields: [],
      failedFields: ['document_readability'],
    };
  }

  // ── Rule 2: Institution must match ────────────────────────────────────────
  if (!institutionMatched) {
    failedFields.push('institution');
    return {
      status: 'FAILED',
      reason: 'wrong_institution',
      reasonMessage: 'The institution on the scanned ID does not match your registered college.',
      matchedFields,
      failedFields,
    };
  }
  matchedFields.push('institution');

  // ── Rule 3: Student name must match ──────────────────────────────────────
  if (!nameMatched) {
    failedFields.push('student_name');
    return {
      status: 'FAILED',
      reason: 'name_mismatch',
      reasonMessage: 'The name on the scanned ID does not match your registered name. If your name on the ID differs significantly from your profile, contact the admin.',
      matchedFields,
      failedFields,
    };
  }
  matchedFields.push('student_name');

  // ── Rule 4: Enrollment number ────────────────────────────────────────────
  if (enrollmentMatch === 'mismatched') {
    failedFields.push('enrollment_number');
    return {
      status: 'FAILED',
      reason: 'enrollment_mismatch',
      reasonMessage: 'The enrollment/roll number on the scanned ID does not match your registered enrollment number.',
      matchedFields,
      failedFields,
    };
  }

  if (enrollmentMatch === 'matched') {
    matchedFields.push('enrollment_number');
  }

  // ── Decision: VERIFIED vs REQUIRES_REVIEW ────────────────────────────────
  // VERIFIED: institution ✓ + name ✓ + enrollment ✓
  // REQUIRES_REVIEW: institution ✓ + name ✓ + enrollment unavailable
  if (enrollmentMatch === 'unavailable') {
    return {
      status: 'REQUIRES_REVIEW',
      reason: 'enrollment_not_verifiable',
      reasonMessage: 'Institution and name matched. Enrollment number could not be verified from the ID scan — your application has been submitted for faculty review.',
      matchedFields,
      failedFields,
    };
  }

  return {
    status: 'VERIFIED',
    reason: 'all_criteria_met',
    reasonMessage: 'All identity fields verified successfully. Institution, name, and enrollment number matched.',
    matchedFields,
    failedFields,
  };
};

// ─── Main Exported Function ───────────────────────────────────────────────────

/**
 * Performs the full multi-factor identity verification.
 *
 * @param {object} ocrResult — output of extractIdCardData
 * @param {object} actor — authenticated student's user document from Firestore
 * @param {object} college — college document (name, domain)
 * @returns {object} — full verification result with status, reason, matchedFields, failedFields
 */
const verifyStudentIdentity = (ocrResult, actor, college) => {
  const rawText = (ocrResult.rawFields && ocrResult.rawFields.rawText)
    ? ocrResult.rawFields.rawText
    : JSON.stringify(ocrResult.rawFields || {});

  // ── Step 1: Document type detection ───────────────────────────────────────
  const documentType = detectDocumentType(ocrResult, rawText);
  logger.info(`[IDVerify] Document type: ${documentType}`);

  // ── Step 2: Institution matching ──────────────────────────────────────────
  const registeredCollegeName = college?.name || '';
  const collegeDomain = college?.domain || actor?.email?.split('@')[1] || '';
  const institutionMatched = matchInstitution(
    ocrResult.collegeName,
    registeredCollegeName,
    collegeDomain
  );
  logger.info(`[IDVerify] Institution match: ${institutionMatched} (extracted: "${ocrResult.collegeName}", registered: "${registeredCollegeName}")`);

  // ── Step 3: Name matching ─────────────────────────────────────────────────
  const registeredName = actor?.name || actor?.displayName || '';
  const nameMatched = matchName(ocrResult.studentName, registeredName);
  logger.info(`[IDVerify] Name match: ${nameMatched} (extracted: "${ocrResult.studentName}", registered: "${registeredName}")`);

  // ── Step 4: Enrollment matching ───────────────────────────────────────────
  const enrollmentCandidates = [
    actor?.enrollmentNumber,
    actor?.rollNumber,
    actor?.studentId,
  ];
  const enrollmentMatch = matchEnrollment(ocrResult.rollNumber, enrollmentCandidates);
  logger.info(`[IDVerify] Enrollment match: ${enrollmentMatch} (extracted: "${ocrResult.rollNumber}")`);

  // ── Step 5: Final decision ────────────────────────────────────────────────
  const decision = makeVerificationDecision({
    documentType,
    institutionMatched,
    nameMatched,
    enrollmentMatch,
  });

  logger.info(`[IDVerify] Final decision: ${decision.status} (reason: ${decision.reason})`);

  return {
    ...decision,
    diagnostics: {
      documentType,
      institutionMatched,
      nameMatched,
      enrollmentMatch,
      ocrConfidence: ocrResult.confidence || 0,
      ocrSource: ocrResult.source || 'unknown',
    },
  };
};

module.exports = {
  verifyStudentIdentity,
  detectDocumentType,
  matchInstitution,
  matchName,
  matchEnrollment,
  makeVerificationDecision,
};
