jest.mock('../../src/services/firebaseAdmin', () => require('../mocks/firebaseAdmin'));
jest.mock('../../src/services/notifications.service', () => ({
  createNotification: jest.fn(async () => ({ id: 'notif_1' })),
}));
jest.mock('../../src/services/audit.service', () => ({
  logAudit: jest.fn(async () => ({})),
}));
jest.mock('../../src/services/stats.service', () => ({
  incrementPlatformStats: jest.fn(async () => ({})),
  incrementCollegeStats: jest.fn(async () => ({})),
}));
jest.mock('../../src/services/communities.service', () => ({
  addStudentToCollegeCommunity: jest.fn(async () => ({})),
}));

let mockUsers = [];

jest.mock('../../src/services/firestore', () => {
  return {
    collection: jest.fn((colName) => {
      if (colName === 'users') {
        const createQuery = (docs) => {
          let currentDocs = [...docs];
          const queryObj = {
            where: jest.fn((field, op, val) => {
              currentDocs = currentDocs.filter((doc) => {
                if (field.includes('.')) {
                  const parts = field.split('.');
                  let v = doc;
                  for (const p of parts) {
                    v = v ? v[p] : undefined;
                  }
                  return v === val;
                }
                return doc[field] === val;
              });
              return queryObj;
            }),
            get: jest.fn(async () => ({
              docs: currentDocs.map((d) => ({
                id: d.id,
                data: () => d,
              })),
            })),
          };
          return queryObj;
        };

        const queryInstance = createQuery(mockUsers);
        queryInstance.doc = jest.fn((docId) => {
          const found = mockUsers.find((u) => u.id === docId);
          return {
            id: docId,
            get: jest.fn(async () => ({
              id: docId,
              exists: !!found,
              data: () => found || {},
            })),
            set: jest.fn(async (updateData, options) => {
              if (found) {
                Object.assign(found, updateData);
              }
              return updateData;
            }),
          };
        });
        return queryInstance;
      }

      return {
        doc: jest.fn((id) => ({
          get: jest.fn(async () => ({ id, exists: false, data: () => ({}) })),
          set: jest.fn(async () => ({})),
        })),
      };
    }),
  };
});

const { listPendingStudents, verifyStudent } = require('../../src/controllers/faculty.controller');
const { verifyIdCard } = require('../../src/controllers/student.controller');
const { createNotification } = require('../../src/services/notifications.service');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createNext = () => jest.fn();

describe('faculty.controller & student ID verification - college scoping and regression tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsers = [
      // College A
      {
        id: 'faculty_a',
        role: 'faculty',
        subRole: 'adminFaculty',
        collegeId: 'college_a',
        name: 'Prof. A',
      },
      {
        id: 'student_a',
        role: 'student',
        collegeId: 'college_a',
        verificationStatus: 'pending',
        name: 'Student A',
        idVerification: { status: 'pending_review' },
      },
      // College B
      {
        id: 'faculty_b',
        role: 'faculty',
        subRole: 'adminFaculty',
        collegeId: 'college_b',
        name: 'Prof. B',
      },
      {
        id: 'student_b',
        role: 'student',
        collegeId: 'college_b',
        verificationStatus: 'pending',
        name: 'Student B',
        idVerification: { status: 'pending_review' },
      },
    ];
  });

  describe('listPendingStudents scoping', () => {
    it("never includes college B's student when called by college A's faculty", async () => {
      const req = {
        userProfile: {
          uid: 'faculty_a',
          role: 'faculty',
          collegeId: 'college_a',
        },
      };
      const res = createRes();
      const next = createNext();

      await listPendingStudents(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledTimes(1);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      const studentIds = responseData.data.students.map((s) => s.id);

      expect(studentIds).toContain('student_a');
      expect(studentIds).not.toContain('student_b');
    });

    it('rejects with no_college_assigned (400) when faculty has no collegeId', async () => {
      const req = {
        userProfile: {
          uid: 'faculty_no_col',
          role: 'faculty',
          collegeId: null,
        },
      };
      const res = createRes();
      const next = createNext();

      await listPendingStudents(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('no_college_assigned');
    });

    it('surfaces students who are already verified but have idVerification.status == pending_review', async () => {
      mockUsers.push({
        id: 'student_resubmitted',
        role: 'student',
        collegeId: 'college_a',
        verificationStatus: 'verified', // already verified from before
        idVerification: { status: 'pending_review' }, // re-submitting corrected ID card
        name: 'Student Resubmitted',
      });

      const req = {
        userProfile: {
          uid: 'faculty_a',
          role: 'faculty',
          collegeId: 'college_a',
        },
      };
      const res = createRes();
      const next = createNext();

      await listPendingStudents(req, res, next);

      const responseData = res.json.mock.calls[0][0];
      const studentIds = responseData.data.students.map((s) => s.id);
      expect(studentIds).toContain('student_resubmitted');
    });
  });

  describe('verifyStudent cross-college protection', () => {
    it("rejects with college_mismatch (403) when faculty A attempts to verify college B's student", async () => {
      const req = {
        userProfile: {
          uid: 'faculty_a',
          role: 'faculty',
          collegeId: 'college_a',
        },
        body: {
          studentId: 'student_b',
          status: 'verified',
        },
      };
      const res = createRes();
      const next = createNext();

      await verifyStudent(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('college_mismatch');
    });

    it("succeeds when faculty A verifies college A's student", async () => {
      const req = {
        userProfile: {
          uid: 'faculty_a',
          role: 'faculty',
          collegeId: 'college_a',
        },
        body: {
          studentId: 'student_a',
          status: 'verified',
        },
      };
      const res = createRes();
      const next = createNext();

      await verifyStudent(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledTimes(1);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(mockUsers.find((u) => u.id === 'student_a').verificationStatus).toBe('verified');
    });
  });

  describe('student verifyIdCard collegeId guard and faculty notification', () => {
    it('rejects with no_college_assigned (400) when student has no collegeId', async () => {
      const req = {
        userProfile: {
          uid: 'student_unassigned',
          role: 'student',
          collegeId: null,
        },
        file: {
          buffer: Buffer.from('fake-image-bytes'),
          mimetype: 'image/jpeg',
        },
      };
      const res = createRes();
      const next = createNext();

      await verifyIdCard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('no_college_assigned');
    });

    it("notifies adminFaculty of the student's specific college upon ID card submission", async () => {
      const req = {
        userProfile: {
          uid: 'student_a',
          role: 'student',
          name: 'Student A',
          collegeId: 'college_a',
        },
        file: {
          buffer: Buffer.from('fake-image-bytes'),
          mimetype: 'image/jpeg',
        },
      };
      const res = createRes();
      const next = createNext();

      await verifyIdCard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'faculty_a',
          type: 'id_card_review',
          referenceId: 'student_a',
        })
      );
      // Ensure faculty B of college B was NOT notified
      expect(createNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'faculty_b',
        })
      );
    });
  });
});
