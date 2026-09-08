class CustomError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code || 'internal_error';
    this.details = details || null;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
