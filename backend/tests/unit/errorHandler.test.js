jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../src/services/errorTracking', () => ({
  captureException: jest.fn(),
}));

const CustomError = require('../../src/utils/CustomError');
const logger = require('../../src/utils/logger');
const { captureException } = require('../../src/services/errorTracking');
const { errorHandler } = require('../../src/middleware/errorHandler');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('errorHandler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles operational custom errors without captureException for <500', () => {
    const err = new CustomError('Bad request', 400, 'bad_request', { field: 'name' });
    const req = { method: 'POST', originalUrl: '/api/v1/student/profile' };
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(logger.error).toHaveBeenCalledWith('Bad request', {
      code: 'bad_request',
      details: { field: 'name' },
    });
    expect(captureException).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Bad request',
        code: 'bad_request',
        details: { field: 'name' },
      },
    });
  });

  it('captures exceptions for 500-level errors with route and user context', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/admin/analytics',
      userProfile: { uid: 'u1', role: 'faculty' },
    };
    const res = makeRes();

    errorHandler(new Error('boom'), req, res, jest.fn());

    expect(captureException).toHaveBeenCalledTimes(1);
    const [capturedError, context] = captureException.mock.calls[0];
    expect(capturedError).toBeInstanceOf(CustomError);
    expect(capturedError.statusCode).toBe(500);
    expect(context.user).toEqual({ id: 'u1', role: 'faculty' });
    expect(context.tags).toEqual({
      route: '/api/v1/admin/analytics',
      method: 'GET',
      statusCode: '500',
    });
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('logs non-operational custom errors with additional log line', () => {
    const err = new CustomError('Internal', 500, 'internal_error');
    err.isOperational = false;

    const req = { method: 'GET', url: '/health' };
    const res = makeRes();

    errorHandler(err, req, res, jest.fn());

    expect(logger.error).toHaveBeenCalledWith('Non-operational error', { error: err });
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
