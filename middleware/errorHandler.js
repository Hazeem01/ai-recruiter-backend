const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  let error = {
    message: 'Internal Server Error',
    statusCode: 500
  };

  if (err.name === 'ValidationError') {
    error.message = 'Validation Error';
    error.statusCode = 400;
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.message = 'Unauthorized';
    error.statusCode = 401;
  } else if (err.name === 'ForbiddenError') {
    error.message = 'Forbidden';
    error.statusCode = 403;
  } else if (err.name === 'NotFoundError') {
    error.message = 'Not Found';
    error.statusCode = 404;
  } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
    error.message = 'Too many requests';
    error.statusCode = 429;
  } else if (err.code === 'AI_API_ERROR') {
    error.message = 'AI service temporarily unavailable';
    error.statusCode = 503;
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(error.details && { details: error.details })
    }
  });
};

class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  errorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
}; 