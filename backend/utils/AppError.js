/**
 * Operational error with an HTTP status and machine-readable code.
 * Throw it from any route/controller; the central error handler formats it.
 *
 *   throw new AppError(404, 'Order not found', 'NOT_FOUND');
 */
class AppError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code || AppError.codeFor(status);
    this.details = details;
  }

  static codeFor(status) {
    return (
      {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'VALIDATION_ERROR',
        429: 'TOO_MANY_REQUESTS',
      }[status] || 'INTERNAL_ERROR'
    );
  }
}

module.exports = AppError;
