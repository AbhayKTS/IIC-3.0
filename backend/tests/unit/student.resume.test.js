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
  extractTextFromDocument: jest.fn(),
}));

jest.mock('../../src/services/resumeParser.service', () => ({
  parseResumeData: jest.fn(),
}));

const db = require('../../src/services/firestore');
const { logAudit } = require('../../src/services/audit.service');
const { extractTextFromDocument } = require('../../src/services/ocr.service');
const { parseResumeData } = require('../../src/services/resumeParser.service');
const { parseResume } = require('../../src/controllers/student.controller');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

describe('student.controller parseResume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when actor is not a student', async () => {
    const req = {
      userProfile: { uid: 'u_1', role: 'recruiter' },
      file: { buffer: Buffer.from('dummy-pdf'), mimetype: 'application/pdf' },
    };
    const res = createRes();
    const next = createNext();

    await parseResume(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('student_only');
  });

  it('rejects when resume file is missing', async () => {
    const req = {
      userProfile: { uid: 'u_student', role: 'student' },
    };
    const res = createRes();
    const next = createNext();

    await parseResume(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('file_required');
  });

  it('extracts text, parses resume data, deduplicates/merges skills, and logs audit', async () => {
    extractTextFromDocument.mockResolvedValueOnce({
      success: true,
      text: 'Extracted raw resume text with skills and education',
    });

    parseResumeData.mockResolvedValueOnce({
      skills: [
        { name: 'Python', category: 'technical' },
        { name: 'Docker', category: 'technical' },
        { name: 'React', category: 'technical' }, // Already exists in user's profile
      ],
      education: [
        { degree: 'B.Tech CS', institution: 'IIT Delhi', year: '2024' },
      ],
      experience: [],
      certifications: ['AWS Cloud Practitioner'],
      links: { github: 'https://github.com/arjun' },
      method: 'azure-openai',
    });

    const userSetMock = jest.fn().mockResolvedValue(null);
    const profileSetMock = jest.fn().mockResolvedValue(null);

    db.collection.mockImplementation((collectionName) => {
      if (collectionName === 'users') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ skills: ['React', 'JavaScript'] }),
            }),
            set: userSetMock,
          }),
        };
      }
      if (collectionName === 'studentProfiles') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ skills: ['React', 'JavaScript'] }),
            }),
            set: profileSetMock,
          }),
        };
      }
      return {
        doc: jest.fn().mockReturnValue({ set: jest.fn() }),
      };
    });

    const req = {
      userProfile: { uid: 'student_99', role: 'student', collegeId: 'iitd' },
      file: { buffer: Buffer.from('my-resume-pdf-bytes'), mimetype: 'application/pdf' },
    };
    const res = createRes();
    const next = createNext();

    await parseResume(req, res, next);

    expect(extractTextFromDocument).toHaveBeenCalledWith(req.file.buffer, 'application/pdf');
    expect(parseResumeData).toHaveBeenCalledWith('Extracted raw resume text with skills and education');

    // Check user doc set call: should contain merged skills (React, JavaScript, Python, Docker)
    expect(userSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.arrayContaining(['React', 'JavaScript', 'Python', 'Docker']),
        resumeExtraction: expect.objectContaining({
          method: 'azure-openai',
          skills: expect.any(Array),
          education: expect.any(Array),
        }),
      }),
      { merge: true }
    );

    // Profile set call should also update skills
    expect(profileSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.arrayContaining(['React', 'JavaScript', 'Python', 'Docker']),
      }),
      { merge: true }
    );

    // Audit log
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'resume_parsed',
        performedBy: 'student_99',
        targetId: 'student_99',
        metadata: expect.objectContaining({
          method: 'azure-openai',
          newSkillsAddedCount: 2, // Python and Docker
        }),
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0].data;
    expect(data.newSkillsAdded).toEqual(['Python', 'Docker']);
    expect(data.mergedSkills).toEqual(expect.arrayContaining(['React', 'JavaScript', 'Python', 'Docker']));
  });
});
