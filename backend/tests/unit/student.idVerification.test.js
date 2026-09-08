jest.mock('../../src/services/firestore', () => {
  const { createFirestoreMock } = require('../mocks/firestore');
  return createFirestoreMock();
});

jest.mock('../../src/services/firebaseAdmin', () => ({
  firestore: Object.assign(jest.fn(() => ({ collection: jest.fn() })), {
    FieldValue: { increment: jest.fn() },
  }),
  auth: () => ({}),
}));

jest.mock('../../src/services/audit.service', () => ({
  logAudit: jest.fn(async () => ({})),
}));

jest.mock('../../src/services/ocr.service', () => ({
  extractIdCardData: jest.fn(),
}));

jest.mock('../../src/services/n8n.service', () => ({
  triggerN8nWorkflow: jest.fn(async () => ({ triggered: false, reason: 'test_mock' })),
}));

jest.mock('../../src/services/jobMatching.service', () => ({
  matchJobsForStudent: jest.fn(async () => []),
}));

const db = require('../../src/services/firestore');
const { logAudit } = require('../../src/services/audit.service');
const { extractIdCardData } = require('../../src/services/ocr.service');
const { triggerN8nWorkflow } = require('../../src/services/n8n.service');
const { verifyIdCard } = require('../../src/controllers/student.controller');
const {
  verifyStudentIdentity,
  detectDocumentType,
  matchName,
  matchEnrollment,
  matchInstitution,
} = require('../../src/services/identityVerification.service');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

// ─── Helper: mock Firestore for a given college ────────────────────────────────
function mockFirestoreForCollege({ collegeName, collegeDomain }) {
  const userSetMock = jest.fn().mockResolvedValue(null);
  db.collection.mockImplementation((collectionName) => {
    if (collectionName === 'colleges') {
      return {
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ name: collegeName, domain: collegeDomain }),
          }),
        }),
      };
    }
    if (collectionName === 'users') {
      return { doc: jest.fn().mockReturnValue({ set: userSetMock }) };
    }
    if (collectionName === 'auditLogs') {
      return { add: jest.fn().mockResolvedValue({}) };
    }
    return { doc: jest.fn().mockReturnValue({ set: jest.fn(), get: jest.fn().mockResolvedValue({ exists: false }) }) };
  });
  return userSetMock;
}

// ─── Unit Tests: identityVerification.service ────────────────────────────────

describe('identityVerification.service — unit tests', () => {

  describe('detectDocumentType', () => {
    it('detects event badge from hackathon keywords', () => {
      const ocrResult = { studentName: 'Ansh Sharma', rollNumber: null, collegeName: null, confidence: 0.7, rawFields: {} };
      const rawText = 'Hackathon 2026 Participant Tech Fest Entry Pass';
      expect(detectDocumentType(ocrResult, rawText)).toBe('event_badge');
    });

    it('detects student ID when DocumentNumber field present', () => {
      const ocrResult = {
        studentName: 'Ansh Sharma',
        rollNumber: '21CSE001',
        collegeName: 'GLA University',
        confidence: 0.9,
        rawFields: { DocumentNumber: { value: '21CSE001' } },
      };
      expect(detectDocumentType(ocrResult, 'GLA University Student ID')).toBe('student_id');
    });

    it('returns insufficient_data when OCR yields nothing', () => {
      const ocrResult = { studentName: null, rollNumber: null, collegeName: null, confidence: 0, rawFields: {} };
      expect(detectDocumentType(ocrResult, '')).toBe('insufficient_data');
    });
  });

  describe('matchName', () => {
    it('matches identical names', () => {
      expect(matchName('Ansh Sharma', 'Ansh Sharma')).toBe(true);
    });
    it('matches case-insensitive', () => {
      expect(matchName('ANSH SHARMA', 'ansh sharma')).toBe(true);
    });
    it('matches with OCR noise (extra char)', () => {
      expect(matchName('Ansh Sharmaa', 'Ansh Sharma')).toBe(true);
    });
    it('rejects completely different name', () => {
      expect(matchName('Rahul Verma', 'Ansh Sharma')).toBe(false);
    });
    it('returns false when name missing', () => {
      expect(matchName(null, 'Ansh Sharma')).toBe(false);
    });
  });

  describe('matchEnrollment', () => {
    it('matches exact enrollment number', () => {
      expect(matchEnrollment('21CSE001', ['21CSE001'])).toBe('matched');
    });
    it('matches ignoring hyphens', () => {
      expect(matchEnrollment('21-CSE-001', ['21CSE001'])).toBe('matched');
    });
    it('returns mismatched when wrong enrollment', () => {
      expect(matchEnrollment('21CSE999', ['21CSE001'])).toBe('mismatched');
    });
    it('returns unavailable when extracted roll too short', () => {
      expect(matchEnrollment('AB', ['21CSE001'])).toBe('unavailable');
    });
    it('returns unavailable when no registered values', () => {
      expect(matchEnrollment('21CSE001', [])).toBe('unavailable');
    });
  });

  describe('matchInstitution', () => {
    it('matches GLA University variations', () => {
      expect(matchInstitution('G.L.A. University', 'GLA University', 'gla.ac.in')).toBe(true);
      expect(matchInstitution('GLA UNIVERSITY MATHURA', 'GLA University', 'gla.ac.in')).toBe(true);
    });
    it('rejects different institution', () => {
      expect(matchInstitution('BITS Pilani', 'IIT Bombay', 'iitb.ac.in')).toBe(false);
    });
    it('returns false when extracted is null', () => {
      expect(matchInstitution(null, 'GLA University', 'gla.ac.in')).toBe(false);
    });
  });

  describe('verifyStudentIdentity — full engine', () => {

    // TEST 1: Correct GLA student ID → VERIFIED
    it('TEST 1: verifies a correct GLA student ID', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-id',
        studentName: 'Ansh Sharma',
        rollNumber: '21CSE001',
        collegeName: 'GLA University',
        confidence: 0.92,
        rawFields: { DocumentNumber: { value: '21CSE001' } },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001', collegeId: 'c_gla' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('VERIFIED');
      expect(result.matchedFields).toContain('institution');
      expect(result.matchedFields).toContain('student_name');
      expect(result.matchedFields).toContain('enrollment_number');
    });

    // TEST 2: Hackathon card → FAILED (invalid_document_type)
    it('TEST 2: rejects a hackathon participant card', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-read-fallback',
        studentName: 'Ansh Sharma',
        rollNumber: null,
        collegeName: null,
        confidence: 0.4,
        rawFields: { rawText: 'Hackathon 2026 Participant Entry Pass Ansh Sharma' },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toBe('invalid_document_type');
    });

    // TEST 3: Student A scans Student B's GLA ID → FAILED (name_mismatch)
    it('TEST 3: rejects another student\'s ID card (name mismatch)', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-id',
        studentName: 'Priya Patel',   // Student B's name
        rollNumber: '21CSE999',
        collegeName: 'GLA University',
        confidence: 0.91,
        rawFields: { DocumentNumber: { value: '21CSE999' } },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toBe('name_mismatch');
    });

    // TEST 4: GLA student scans another institution's ID → FAILED (wrong_institution)
    it('TEST 4: rejects an ID from another institution', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-id',
        studentName: 'Ansh Sharma',
        rollNumber: '21CSE001',
        collegeName: 'BITS Pilani',
        confidence: 0.88,
        rawFields: { DocumentNumber: { value: '21CSE001' } },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toBe('wrong_institution');
    });

    // TEST 5: Event badge with student name → FAILED (invalid_document_type)
    it('TEST 5: rejects an event badge even with correct name', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-read-fallback',
        studentName: 'Ansh Sharma',
        rollNumber: null,
        collegeName: null,
        confidence: 0.55,
        rawFields: { rawText: 'Ansh Sharma Speaker Tech Symposium 2026 Conference Pass GLA' },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toBe('invalid_document_type');
    });

    // TEST 6: Correct student ID but enrollment not on ID → REQUIRES_REVIEW
    it('TEST 6: returns REQUIRES_REVIEW when enrollment not visible on ID', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-read-fallback',
        studentName: 'Ansh Sharma',
        rollNumber: null,    // Enrollment not extracted from ID
        collegeName: 'GLA University',
        confidence: 0.72,
        rawFields: { rawText: 'Ansh Sharma Student GLA University Department CSE Session 2021-25' },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('REQUIRES_REVIEW');
      expect(result.reason).toBe('enrollment_not_verifiable');
    });

    // TEST 7: Enrollment mismatch → FAILED
    it('TEST 7: fails when enrollment number does not match', () => {
      const ocrResult = {
        success: true, source: 'prebuilt-id',
        studentName: 'Ansh Sharma',
        rollNumber: '21CSE999',   // Wrong enrollment
        collegeName: 'GLA University',
        confidence: 0.90,
        rawFields: { DocumentNumber: { value: '21CSE999' } },
      };
      const actor = { uid: 'u1', name: 'Ansh Sharma', email: 'ansh@gla.ac.in', enrollmentNumber: '21CSE001' };
      const college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in' };
      const result = verifyStudentIdentity(ocrResult, actor, college);
      expect(result.status).toBe('FAILED');
      expect(result.reason).toBe('enrollment_mismatch');
    });
  });
});

// ─── Integration Tests: verifyIdCard controller ───────────────────────────────

describe('student.controller verifyIdCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when actor is not a student', async () => {
    const req = {
      userProfile: { uid: 'u_1', role: 'faculty' },
      file: { buffer: Buffer.from('test'), mimetype: 'image/jpeg' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('student_only');
  });

  it('rejects when file is missing', async () => {
    const req = {
      userProfile: { uid: 'u_1', role: 'student', collegeId: 'iitd' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('file_required');
  });

  it('processes a matching GLA student ID and returns VERIFIED', async () => {
    extractIdCardData.mockResolvedValueOnce({
      success: true,
      source: 'prebuilt-id',
      studentName: 'Ansh Sharma',
      rollNumber: '21CSE001',
      collegeName: 'GLA University',
      validUntil: '2025-06-01',
      confidence: 0.93,
      rawFields: { DocumentNumber: { value: '21CSE001' } },
    });

    const userSetMock = mockFirestoreForCollege({ collegeName: 'GLA University', collegeDomain: 'gla.ac.in' });

    const req = {
      userProfile: {
        uid: 'student_gla',
        role: 'student',
        collegeId: 'c_gla',
        name: 'Ansh Sharma',
        email: 'ansh@gla.ac.in',
        enrollmentNumber: '21CSE001',
      },
      file: { buffer: Buffer.from('gla-id-bytes'), mimetype: 'image/jpeg' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    expect(extractIdCardData).toHaveBeenCalledWith(req.file.buffer, 'image/jpeg');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const savedData = userSetMock.mock.calls[0][0];
    expect(savedData.idVerification.status).toBe('VERIFIED');
    expect(savedData.verificationStatus).toBe('verified');
    expect(savedData.idVerification.matchedFields).toContain('institution');
    expect(savedData.idVerification.matchedFields).toContain('student_name');
    expect(savedData.idVerification.matchedFields).toContain('enrollment_number');

    // Audit log uses new action type
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'id_card_verification_attempt',
        metadata: expect.objectContaining({ status: 'VERIFIED' }),
      })
    );

    // n8n triggered on VERIFIED
    expect(triggerN8nWorkflow).toHaveBeenCalledWith(
      'student.verified',
      expect.objectContaining({ studentId: 'student_gla' })
    );
  });

  it('CRITICAL: rejects hackathon card (FAILED: invalid_document_type)', async () => {
    extractIdCardData.mockResolvedValueOnce({
      success: true,
      source: 'prebuilt-read-fallback',
      studentName: 'Ansh Sharma',
      rollNumber: null,
      collegeName: null,
      confidence: 0.4,
      rawFields: { rawText: 'Hackathon 2026 Participant Entry Pass Ansh Sharma Tech Fest' },
    });

    const userSetMock = mockFirestoreForCollege({ collegeName: 'GLA University', collegeDomain: 'gla.ac.in' });

    const req = {
      userProfile: {
        uid: 'student_gla',
        role: 'student',
        collegeId: 'c_gla',
        name: 'Ansh Sharma',
        email: 'ansh@gla.ac.in',
        enrollmentNumber: '21CSE001',
      },
      file: { buffer: Buffer.from('hackathon-badge'), mimetype: 'image/jpeg' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const savedData = userSetMock.mock.calls[0][0];
    expect(savedData.idVerification.status).toBe('FAILED');
    expect(savedData.idVerification.reason).toBe('invalid_document_type');
    // Must NOT set verificationStatus to 'verified'
    expect(savedData.verificationStatus).not.toBe('verified');
    // n8n must NOT be triggered for a failed verification
    expect(triggerN8nWorkflow).not.toHaveBeenCalledWith('student.verified', expect.anything());
  });

  it('rejects another institution\'s card (FAILED: wrong_institution)', async () => {
    extractIdCardData.mockResolvedValueOnce({
      success: true,
      source: 'prebuilt-id',
      studentName: 'Ansh Sharma',
      rollNumber: '21CSE001',
      collegeName: 'BITS Pilani',
      confidence: 0.88,
      rawFields: { DocumentNumber: { value: '21CSE001' } },
    });

    const userSetMock = mockFirestoreForCollege({ collegeName: 'GLA University', collegeDomain: 'gla.ac.in' });

    const req = {
      userProfile: {
        uid: 'student_gla',
        role: 'student',
        collegeId: 'c_gla',
        name: 'Ansh Sharma',
        email: 'ansh@gla.ac.in',
        enrollmentNumber: '21CSE001',
      },
      file: { buffer: Buffer.from('bits-card'), mimetype: 'image/png' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    const savedData = userSetMock.mock.calls[0][0];
    expect(savedData.idVerification.status).toBe('FAILED');
    expect(savedData.idVerification.reason).toBe('wrong_institution');
  });
});
