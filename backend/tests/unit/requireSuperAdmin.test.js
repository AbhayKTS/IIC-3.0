const { requireSuperAdmin } = require('../../src/middleware/requireSuperAdmin');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const createNext = () => jest.fn();

describe('requireSuperAdmin middleware', () => {
  it('rejects when user profile is missing', () => {
    const req = { userProfile: null };
    const res = createRes();
    const next = createNext();

    requireSuperAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('profile_missing');
  });

  it('rejects when platformRole is not superAdmin', () => {
    const req = { userProfile: { role: 'faculty', subRole: 'adminFaculty' } };
    const res = createRes();
    const next = createNext();

    requireSuperAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('superadmin_only');
  });

  it('allows when platformRole is superAdmin', () => {
    const req = { userProfile: { role: 'faculty', platformRole: 'superAdmin' } };
    const res = createRes();
    const next = createNext();

    requireSuperAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
