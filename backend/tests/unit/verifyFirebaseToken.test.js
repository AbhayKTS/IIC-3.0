jest.mock('../../src/services/firebaseAdmin', () => require('../mocks/firebaseAdmin'));

const { verifyFirebaseToken } = require('../../src/middleware/verifyFirebaseToken');
const admin = require('../../src/services/firebaseAdmin');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('verifyFirebaseToken middleware', () => {
  it('sets req.auth for valid token', async () => {
    const req = { headers: { authorization: 'Bearer token-1' } };
    const res = createRes();
    const next = jest.fn();

    await verifyFirebaseToken(req, res, next);

    expect(admin._mockVerifyIdToken).toHaveBeenCalled();
    expect(req.auth).toBeDefined();
    expect(next).toHaveBeenCalledWith();
  });
});
