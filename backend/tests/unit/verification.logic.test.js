jest.mock('../../src/services/firestore', () => {
  const { createFirestoreMock } = require('../mocks/firestore');
  return createFirestoreMock({
    profile: { role: 'student', collegeId: 'college_1', verificationStatus: 'pending' },
  });
});

jest.mock('../../src/services/notifications.service', () => ({
  createNotification: jest.fn(async () => null),
}));

jest.mock('../../src/services/communities.service', () => ({
  addStudentToCollegeCommunity: jest.fn(async () => null),
}));

jest.mock('../../src/services/audit.service', () => ({
  logAudit: jest.fn(async () => null),
}));

jest.mock('../../src/services/stats.service', () => ({
  incrementPlatformStats: jest.fn(async () => null),
  incrementCollegeStats: jest.fn(async () => null),
}));

const { verifyStudent } = require('../../src/controllers/faculty.controller');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('verification logic', () => {
  it('rejects non-faculty actor', async () => {
    const req = { userProfile: { role: 'student' }, body: { studentId: 'student_1', status: 'verified' } };
    const res = createRes();
    const next = jest.fn();

    await verifyStudent(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
