/**
 * Centralised 404 + error handling.
 *
 * Every error response has the same shape:
 *   { success: false, message, error: { code, message, details? } }
 * `message` is kept at the top level for backward compatibility with the
 * frontend (which reads err.response.data.message).
 */
const multer = require('multer');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function normalise(err) {
  if (err instanceof AppError) return err;

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max allowed size exceeded.' : err.message;
    return new AppError(400, msg, 'UPLOAD_ERROR');
  }
  if (err?.message === 'Images and PDFs only!' || err?.message === 'Images only!') {
    return new AppError(400, err.message, 'UPLOAD_ERROR');
  }
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(400, `Invalid ${err.path}: ${err.value}`, 'INVALID_ID');
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return new AppError(422, 'Validation failed', 'VALIDATION_ERROR', details);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new AppError(409, `An account with this ${field} already exists.`, 'DUPLICATE');
  }
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return new AppError(401, 'Not authorized, token invalid or expired');
  }
  if (err?.type === 'entity.too.large') return new AppError(413, 'Request body too large', 'PAYLOAD_TOO_LARGE');
  if (err?.type === 'entity.parse.failed') return new AppError(400, 'Malformed JSON body', 'BAD_JSON');
  if (typeof err?.message === 'string' && err.message.startsWith('CORS blocked')) {
    return new AppError(403, 'Origin not allowed', 'CORS');
  }
  return null;
}

function errorHandler(err, req, res, next) {
  const known = normalise(err);
  const status = known?.status || 500;
  const isServerError = status >= 500;

  if (isServerError) console.error(err);

  // Never leak internal error text for unexpected 5xx errors in production.
  const exposeInternals = process.env.NODE_ENV === 'development';
  const message = known ? known.message : exposeInternals ? err.message : 'Something went wrong. Please try again later.';

  res.status(status).json({
    success: false,
    message,
    error: {
      code: known?.code || 'INTERNAL_ERROR',
      message,
      ...(known?.details ? { details: known.details } : {}),
      ...(exposeInternals && isServerError ? { stack: err.stack } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
