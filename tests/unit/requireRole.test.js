const { requireRole } = require('../../src/middleware/requireRole');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

describe('requireRole middleware', () => {
  it('rejects when profile is missing', () => {
    const req = { userProfile: null };
    const res = createRes();
    const next = createNext();

    requireRole(['student'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('profile_missing');
  });

  it('rejects when role field is missing', () => {
    const req = { userProfile: {} };
    const res = createRes();
    const next = createNext();

    requireRole(['student'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('profile_missing');
  });

  it('rejects when role is not permitted', () => {
    const req = { userProfile: { role: 'recruiter' } };
    const res = createRes();
    const next = createNext();

    requireRole(['student', 'faculty'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('role_forbidden');
  });

  it('allows when role is permitted', () => {
    const req = { userProfile: { role: 'student' } };
    const res = createRes();
    const next = createNext();

    requireRole(['student'])(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
