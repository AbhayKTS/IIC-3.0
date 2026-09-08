const { requireVerifiedStudent } = require('../../src/middleware/requireVerifiedStudent');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

describe('requireVerifiedStudent middleware', () => {
  it('rejects missing user profile', () => {
    const req = { userProfile: null };
    const res = createRes();
    const next = createNext();

    requireVerifiedStudent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('profile_missing');
  });

  it('rejects non-student role', () => {
    const req = { userProfile: { role: 'faculty', verificationStatus: 'verified' } };
    const res = createRes();
    const next = createNext();

    requireVerifiedStudent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('student_only');
  });

  it('rejects unverified student', () => {
    const req = { userProfile: { role: 'student', verificationStatus: 'pending' } };
    const res = createRes();
    const next = createNext();

    requireVerifiedStudent(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('student_unverified');
  });

  it('allows verified student', () => {
    const req = { userProfile: { role: 'student', verificationStatus: 'verified' } };
    const res = createRes();
    const next = createNext();

    requireVerifiedStudent(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
