jest.mock('../../src/services/firestore', () => {
  const { createFirestoreMock } = require('../mocks/firestore');
  return createFirestoreMock();
});

jest.mock('../../src/services/codingProfile.service');

const {
  updateCodingProfiles,
  getCodingProfiles,
  refreshCodingProfiles,
} = require('../../src/controllers/codingProfile.controller');
const codingProfileService = require('../../src/services/codingProfile.service');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createNext = () => jest.fn();

describe('codingProfile.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCodingProfiles', () => {
    it('rejects when student context is missing', async () => {
      const req = { userProfile: null, body: {} };
      const res = createRes();
      const next = createNext();

      await updateCodingProfiles(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('auth_missing');
    });

    it('rejects invalid LeetCode username format', async () => {
      const req = {
        userProfile: { uid: 'student_1' },
        body: { leetcodeUsername: 'https://leetcode.com/user/' },
      };
      const res = createRes();
      const next = createNext();

      await updateCodingProfiles(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('LEETCODE_INVALID_USERNAME');
    });

    it('rejects invalid Codeforces handle format', async () => {
      const req = {
        userProfile: { uid: 'student_1' },
        body: { codeforcesHandle: 'c@deforces' },
      };
      const res = createRes();
      const next = createNext();

      await updateCodingProfiles(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('CODEFORCES_INVALID_HANDLE');
    });

    it('calls syncStudentCodingProfiles and succeeds on valid handles', async () => {
      codingProfileService.syncStudentCodingProfiles.mockResolvedValueOnce({
        leetcode: { username: 'ansh_codr', status: 'connected', totalSolved: 150 },
        codeforces: { handle: 'ansh_dev', status: 'connected', totalSolved: 90 },
      });

      const req = {
        userProfile: { uid: 'student_1' },
        body: { leetcodeUsername: 'ansh_codr', codeforcesHandle: 'ansh_dev' },
      };
      const res = createRes();
      const next = createNext();

      await updateCodingProfiles(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(codingProfileService.syncStudentCodingProfiles).toHaveBeenCalledWith('student_1', {
        leetcodeUsername: 'ansh_codr',
        codeforcesHandle: 'ansh_dev',
        forceRefresh: true,
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            codingProfiles: expect.objectContaining({
              leetcode: expect.objectContaining({ username: 'ansh_codr' }),
              codeforces: expect.objectContaining({ handle: 'ansh_dev' }),
            }),
          }),
        })
      );
    });
  });

  describe('getCodingProfiles', () => {
    it('returns stored coding profiles for the authenticated student', async () => {
      codingProfileService.getStoredCodingProfiles.mockResolvedValueOnce({
        leetcode: { username: 'test_user', totalSolved: 80 },
        codeforces: null,
      });

      const req = { userProfile: { uid: 'student_2' } };
      const res = createRes();
      const next = createNext();

      await getCodingProfiles(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            codingProfiles: expect.objectContaining({
              leetcode: expect.objectContaining({ username: 'test_user' }),
            }),
          }),
        })
      );
    });
  });

  describe('refreshCodingProfiles', () => {
    it('forces fresh synchronization for authenticated student', async () => {
      codingProfileService.syncStudentCodingProfiles.mockResolvedValueOnce({
        leetcode: { username: 'fresh_lc', totalSolved: 300 },
        codeforces: { handle: 'fresh_cf', totalSolved: 200 },
      });

      const req = { userProfile: { uid: 'student_3' } };
      const res = createRes();
      const next = createNext();

      await refreshCodingProfiles(req, res, next);
      expect(codingProfileService.syncStudentCodingProfiles).toHaveBeenCalledWith('student_3', {
        forceRefresh: true,
      });
      expect(res.json).toHaveBeenCalled();
    });
  });
});
