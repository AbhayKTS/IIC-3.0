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

const db = require('../../src/services/firestore');
const { logAudit } = require('../../src/services/audit.service');
const { extractIdCardData } = require('../../src/services/ocr.service');
const { verifyIdCard } = require('../../src/controllers/student.controller');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

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

  it('processes OCR, checks fuzzy college match, saves user doc, and writes audit log', async () => {
    extractIdCardData.mockResolvedValueOnce({
      success: true,
      source: 'prebuilt-id',
      studentName: 'Aarav Gupta',
      rollNumber: '2023CS1001',
      collegeName: 'Indian Institute of Technology Delhi',
      validUntil: '2027-05-31',
      confidence: 0.95,
      rawFields: { FirstName: { value: 'Aarav' } },
    });

    const userSetMock = jest.fn().mockResolvedValue(null);

    db.collection.mockImplementation((collectionName) => {
      if (collectionName === 'colleges') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ name: 'IIT Delhi', domain: 'iitd.ac.in' }),
            }),
          }),
        };
      }
      if (collectionName === 'users') {
        return {
          doc: jest.fn().mockReturnValue({
            set: userSetMock,
          }),
        };
      }
      return { doc: jest.fn().mockReturnValue({ set: jest.fn() }) };
    });

    const req = {
      userProfile: { uid: 'student_123', role: 'student', collegeId: 'iitd' },
      file: { buffer: Buffer.from('dummy-image-bytes'), mimetype: 'image/jpeg' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    expect(extractIdCardData).toHaveBeenCalledWith(req.file.buffer, 'image/jpeg');

    expect(userSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idVerification: expect.objectContaining({
          status: 'pending_review',
          confidence: 0.95,
          source: 'prebuilt-id',
          extractedData: expect.objectContaining({
            studentName: 'Aarav Gupta',
            rollNumber: '2023CS1001',
          }),
          collegeMatch: expect.objectContaining({
            matched: true,
            expectedCollegeName: 'IIT Delhi',
          }),
        }),
      }),
      { merge: true }
    );

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'id_card_ocr_submitted',
        performedBy: 'student_123',
        performedByRole: 'student',
        targetId: 'student_123',
        collegeId: 'iitd',
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          idVerification: expect.objectContaining({
            status: 'pending_review',
          }),
        }),
      })
    );
  });

  it('flags college mismatch for faculty review without hard-blocking', async () => {
    extractIdCardData.mockResolvedValueOnce({
      success: true,
      source: 'prebuilt-read-fallback',
      studentName: 'Sanjay Kumar',
      rollNumber: '2023BITS002',
      collegeName: 'BITS Pilani',
      validUntil: '2026',
      confidence: 0.85,
    });

    const userSetMock = jest.fn().mockResolvedValue(null);

    db.collection.mockImplementation((collectionName) => {
      if (collectionName === 'colleges') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ name: 'IIT Bombay', domain: 'iitb.ac.in' }),
            }),
          }),
        };
      }
      if (collectionName === 'users') {
        return {
          doc: jest.fn().mockReturnValue({ set: userSetMock }),
        };
      }
      return { doc: jest.fn().mockReturnValue({ set: jest.fn() }) };
    });

    const req = {
      userProfile: { uid: 'student_456', role: 'student', collegeId: 'iitb' },
      file: { buffer: Buffer.from('bits-card'), mimetype: 'image/png' },
    };
    const res = createRes();
    const next = createNext();

    await verifyIdCard(req, res, next);

    expect(userSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idVerification: expect.objectContaining({
          collegeMatch: expect.objectContaining({
            matched: false,
            mismatchFlagged: true,
            extractedCollegeName: 'BITS Pilani',
            expectedCollegeName: 'IIT Bombay',
          }),
        }),
      }),
      { merge: true }
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
