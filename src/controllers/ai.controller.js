const aiService = require('../services/ai.service');
const db = require('../services/firestore');
const { ok, fail } = require('../utils/response');

module.exports = {
  /**
   * POST /ai/moderate
   * Body: { text: string }
   * Returns moderation result
   */
  async moderate(req, res, next) {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string') {
        return fail(res, 'Missing or invalid "text" field', 400, 'validation_error');
      }
      const result = await aiService.moderateContent(text.substring(0, 2000));
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /ai/generate-resume
   * Body: { studentId: string }
   * Returns AI-generated resume markdown
   */
  async generateResume(req, res, next) {
    try {
      const { studentId } = req.body || {};
      if (!studentId) {
        return fail(res, 'Missing "studentId"', 400, 'validation_error');
      }
      const snap = await db.collection('students').doc(studentId).get();
      if (!snap.exists) {
        return fail(res, 'Student not found', 404, 'not_found');
      }
      const student = { id: snap.id, ...snap.data() };
      const result = await aiService.generateResume(student);
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /ai/recommend-students
   * Body: { skills: string[], minScore?: number, collegeId?: string }
   * Returns ranked student recommendations
   */
  async recommendStudents(req, res, next) {
    try {
      const { skills, minScore, collegeId } = req.body || {};
      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return fail(res, 'Missing or invalid "skills" array', 400, 'validation_error');
      }
      let query = db.collection('students');
      const snapshot = await query.get();
      let students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (collegeId) {
        students = students.filter((s) => s.collegeId === collegeId);
      }
      if (minScore) {
        students = students.filter((s) => {
          const total = (s.points?.cultural || 0) + (s.points?.sports || 0) + (s.points?.education || 0) + (s.points?.coding || 0);
          return total >= minScore;
        });
      }
      const result = await aiService.recommendStudents({ skills, minScore, collegeId }, students);
      return ok(res, result);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * GET /ai/status
   * Returns AI service status (is Gemini configured?)
   */
  async status(req, res, next) {
    try {
      const hasKey = Boolean(process.env.GEMINI_API_KEY);
      const gemini = await aiService.initGemini();
      return ok(res, {
        available: Boolean(gemini),
        provider: gemini ? 'gemini-2.0-flash' : 'rule-based-fallback',
        apiKeyConfigured: hasKey,
      });
    } catch (error) {
      return next(error);
    }
  },
};
