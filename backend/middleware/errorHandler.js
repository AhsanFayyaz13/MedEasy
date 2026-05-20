// Centralized error handler
const multer = require('multer');

function notFound(req, res, next) {
  res.status(404);
  res.json({ message: `Not Found - ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    // handle Multer-specific errors
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large. Max allowed size exceeded.'
      : err.message;
    return res.status(400).json({ message });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
