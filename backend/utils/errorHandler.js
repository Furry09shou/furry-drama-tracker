class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const globalErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy denied' });
  }
  const statusCode = err.statusCode || 500;
  console.error(err.stack);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(statusCode).json({
    message: err.message || 'Server error',
    ...(isDev && { stack: err.stack })
  });
};

module.exports = { AppError, asyncHandler, globalErrorHandler };
