/**
 * AI Service — Google Gemini-powered intelligence for CollegeVerse.
 *
 * Features:
 *   1. Content moderation  — classifies text as safe/unsafe
 *   2. Resume generation   — creates professional resumes from student data
 *   3. Student recommendations — suggests students matching criteria
 *
 * Requires: GEMINI_API_KEY in env. Falls back to rule-based logic if absent.
 */

const logger = require('../utils/logger');

let genAI = null;
let model = null;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const initGemini = async () => {
  if (model) return model;
  if (!GEMINI_API_KEY) {
    logger.warn('[AI] GEMINI_API_KEY not set — using rule-based fallbacks');
    return null;
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    logger.info('[AI] Gemini model initialised');
    return model;
  } catch (err) {
    logger.error('[AI] Failed to initialise Gemini:', err.message);
    return null;
  }
};

// ── Profanity / Regex fallback for moderation ─────────────────
const PROFANITY_PATTERNS = [
  // Common slurs & abuse (regex for variations)
  /\b(f+u+c+k+|sh+i+t+|a+s+s+h+o+l+e|b+i+t+c+h|d+a+m+n+|c+r+a+p+)\b/i,
  /\b(bastard|bloody|bollocks|bugger|cunt|dick|piss|slut|wanker|whore)\b/i,
  // Hate speech patterns
  /\b(nigger|faggot|retard|spastic|tranny)\b/i,
  // Threats
  /\b(kill\s+you|murder\s+you|rape\s+you|beat\s+you|die\b.*\bplease)\b/i,
  // Harassment
  /\b(kys|neck\s+yourself|go\s+die)\b/i,
  // Sexual content
  /\b(porn|xxx|nude|naked|sex\s*chat|send\s*nudes)\b/i,
];

const ruleBasedModeration = (text) => {
  const lower = String(text || '').toLowerCase();
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        allowed: false,
        reason: 'Content flagged by automated filter',
        confidence: 0.85,
        method: 'rule-based',
      };
    }
  }
  return { allowed: true, reason: null, confidence: 0.7, method: 'rule-based' };
};

// ── 1. Content Moderation ─────────────────────────────────────
const moderateContent = async (text) => {
  if (!text || String(text).trim().length === 0) {
    return { allowed: true, reason: null, confidence: 1.0, method: 'empty' };
  }

  const gemini = await initGemini();
  if (!gemini) return ruleBasedModeration(text);

  try {
    const prompt = `You are a content moderator for a college student platform (CollegeVerse). Analyse the following message and determine if it should be ALLOWED or BLOCKED.

Block messages that contain:
- Profanity, slurs, or hate speech
- Sexual or explicit content
- Threats, harassment, or bullying
- Spam or scam content
- Personal information sharing (phone numbers, addresses)
- Drug or illegal activity promotion

Allow normal student conversations, academic discussions, event planning, and friendly banter.

Message: "${text.substring(0, 500)}"

Respond ONLY with a JSON object (no markdown): {"allowed": true/false, "reason": "brief reason or null", "confidence": 0.0-1.0}`;

    const result = await gemini.generateContent(prompt);
    const response = result.response.text().trim();
    // Strip markdown code fences if present
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      allowed: Boolean(parsed.allowed),
      reason: parsed.reason || null,
      confidence: Number(parsed.confidence) || 0.9,
      method: 'gemini',
    };
  } catch (err) {
    logger.error('[AI] Gemini moderation failed, falling back:', err.message);
    return ruleBasedModeration(text);
  }
};

// ── 2. Resume Generation ──────────────────────────────────────
const generateResume = async (student) => {
  const gemini = await initGemini();

  const profileSummary = buildProfileSummary(student);

  if (!gemini) {
    // Rule-based fallback — structured template
    return buildFallbackResume(student, profileSummary);
  }

  try {
    const prompt = `You are a professional resume writer. Generate a polished, ATS-friendly resume for a college student based on the following profile data. Use clean formatting with sections. Output in Markdown format.

Student Profile:
${profileSummary}

Requirements:
- Professional summary (2-3 sentences)
- Education section
- Skills section (categorise technical vs soft skills)
- Experience & Achievements section
- Certifications section
- Coding Profiles & Links section
- Keep it concise (max 1 page worth of content)
- Use action verbs and quantify achievements where possible
- Tone: Professional but energetic

Output the resume in clean Markdown.`;

    const result = await gemini.generateContent(prompt);
    return {
      resume: result.response.text().trim(),
      method: 'gemini',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[AI] Gemini resume generation failed:', err.message);
    return buildFallbackResume(student, profileSummary);
  }
};

// ── 3. Student Recommendation ─────────────────────────────────
const recommendStudents = async (criteria, students) => {
  const gemini = await initGemini();

  if (!gemini) {
    // Rule-based: simple skill matching + score sorting
    return ruleBasedRecommendation(criteria, students);
  }

  try {
    const studentSummaries = students.slice(0, 20).map((s) => ({
      id: s.id,
      name: s.name,
      skills: s.skills || [],
      points: s.points || {},
      totalScore: (s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0),
      achievements: (s.achievements || []).length,
      certificates: (s.certificates || []).length,
      collegeId: s.collegeId,
    }));

    const prompt = `You are a talent recommendation engine. Given the following hiring criteria and student profiles, rank the top 5 best matches and explain why.

Criteria: ${JSON.stringify(criteria)}

Student Profiles: ${JSON.stringify(studentSummaries)}

Respond ONLY with a JSON object (no markdown): {"recommendations": [{"studentId": "...", "score": 0-100, "reason": "brief reason"}]}`;

    const result = await gemini.generateContent(prompt);
    const response = result.response.text().trim();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return { ...JSON.parse(cleaned), method: 'gemini' };
  } catch (err) {
    logger.error('[AI] Gemini recommendation failed:', err.message);
    return ruleBasedRecommendation(criteria, students);
  }
};

// ── Helpers ───────────────────────────────────────────────────
const buildProfileSummary = (s) => {
  const lines = [
    `Name: ${s.name || 'N/A'}`,
    `Email: ${s.email || 'N/A'}`,
    `College: ${s.collegeId || 'N/A'}`,
    `Bio: ${s.bio || 'N/A'}`,
    `Skills: ${(s.skills || []).join(', ') || 'None listed'}`,
    `Points: Cultural=${s.points?.cultural || 0}, Sports=${s.points?.sports || 0}, Education=${s.points?.education || 0}, Coding=${s.points?.coding || 0}`,
    `Total Points: ${(s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0)}`,
  ];
  if (s.achievements?.length) {
    lines.push(`Achievements: ${s.achievements.map((a) => `${a.title} (${a.date}, +${a.points}pts)`).join('; ')}`);
  }
  if (s.certificates?.length) {
    lines.push(`Certifications: ${s.certificates.map((c) => `${c.title} by ${c.issuer} (${c.date})`).join('; ')}`);
  }
  const links = [];
  if (s.github) links.push(`GitHub: ${s.github}`);
  if (s.linkedin) links.push(`LinkedIn: ${s.linkedin}`);
  if (s.leetcode) links.push(`LeetCode: ${s.leetcode}`);
  if (s.codeforces) links.push(`Codeforces: ${s.codeforces}`);
  if (s.codechef) links.push(`CodeChef: ${s.codechef}`);
  if (links.length) lines.push(`Profiles: ${links.join(', ')}`);
  return lines.join('\n');
};

const buildFallbackResume = (s, profileSummary) => {
  const totalPts = (s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0);
  const resume = `# ${s.name}
${s.email}${s.linkedin ? ` | ${s.linkedin}` : ''}${s.github ? ` | ${s.github}` : ''}

## Professional Summary
${s.bio || `Motivated college student at ${s.collegeId || 'a top university'} with ${totalPts} achievement points across academics, coding, sports, and cultural activities.`}

## Education
**${s.collegeId ? s.collegeId.toUpperCase() : 'University'}**
- Verified Student | CollegeVerse Points: ${totalPts}

## Technical Skills
${(s.skills || []).map((sk) => `- ${sk}`).join('\n') || '- No skills listed yet'}

## Achievements
${(s.achievements || []).map((a) => `- **${a.title}** — ${a.date} (+${a.points} points)`).join('\n') || '- Build your achievements to enhance your resume'}

## Certifications
${(s.certificates || []).map((c) => `- **${c.title}** — ${c.issuer} (${c.date})`).join('\n') || '- Add certifications to stand out'}

## Coding Profiles
${s.leetcode ? `- LeetCode: ${s.leetcode}\n` : ''}${s.codeforces ? `- Codeforces: ${s.codeforces}\n` : ''}${s.codechef ? `- CodeChef: ${s.codechef}\n` : ''}${s.github ? `- GitHub: ${s.github}\n` : ''}
## Activity Score Breakdown
| Category | Points |
|----------|--------|
| Cultural | ${s.points?.cultural || 0} |
| Sports   | ${s.points?.sports || 0} |
| Education| ${s.points?.education || 0} |
| Coding   | ${s.points?.coding || 0} |
| **Total**| **${totalPts}** |
`;

  return {
    resume,
    method: 'template',
    generatedAt: new Date().toISOString(),
  };
};

const ruleBasedRecommendation = (criteria, students) => {
  const requiredSkills = (criteria.skills || []).map((s) => s.toLowerCase());
  const scored = students
    .filter((s) => s.verificationStatus === 'verified')
    .map((s) => {
      const studentSkills = (s.skills || []).map((sk) => sk.toLowerCase());
      const matchedSkills = requiredSkills.filter((rs) => studentSkills.some((ss) => ss.includes(rs) || rs.includes(ss)));
      const skillScore = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 60 : 30;
      const totalPts = (s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0);
      const pointScore = Math.min(totalPts / 20, 20);
      const achieveScore = Math.min((s.achievements || []).length * 5, 10);
      const certScore = Math.min((s.certificates || []).length * 5, 10);
      const total = Math.round(skillScore + pointScore + achieveScore + certScore);
      return {
        studentId: s.id,
        score: Math.min(total, 100),
        reason: `Matched ${matchedSkills.length}/${requiredSkills.length} skills, ${totalPts} total points, ${(s.achievements || []).length} achievements`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { recommendations: scored, method: 'rule-based' };
};

module.exports = {
  moderateContent,
  generateResume,
  recommendStudents,
  initGemini,
};
