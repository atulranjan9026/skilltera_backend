const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const HTTP_STATUS = require('../constants/httpStatus');
const { ERROR_MESSAGES } = require('../constants');

/**
 * Error handler middleware
 * Catches all errors and sends appropriate response
 */
const errorHandler = (err, req, res, next) => {
    let error = err;

    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: req.userId,
    });

    // Convert non-ApiError errors to ApiError
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
        const message = error.message || ERROR_MESSAGES.SERVER_ERROR;
        error = new ApiError(statusCode, message, false, err.stack);
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
        // Mongoose validation error
        const errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        error = new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, 'Validation failed');
        error.errors = errors;
    } else if (err.name === 'CastError') {
        // Mongoose cast error (invalid ObjectId)
        error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
    } else if (err.code === 11000) {
        // MongoDB duplicate key error
        const field = Object.keys(err.keyPattern)[0];
        error = ApiError.conflict(`${field} already exists`);
    } else if (err.name === 'JsonWebTokenError') {
        error = ApiError.unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
    } else if (err.name === 'TokenExpiredError') {
        error = ApiError.unauthorized(ERROR_MESSAGES.TOKEN_EXPIRED);
    } else if (err.name === 'MulterError') {
        // File upload error
        if (err.code === 'LIMIT_FILE_SIZE') {
            error = ApiError.badRequest(ERROR_MESSAGES.FILE_TOO_LARGE);
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            error = ApiError.badRequest('Unexpected file field');
        } else {
            error = ApiError.badRequest(err.message);
        }
    }

    // Prepare response
    const response = {
        success: false,
        message: error.message,
        ...(error.errors && { errors: error.errors }),
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
    }

    // Send response
    res.status(error.statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
    const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
    next(error);
};

module.exports = {
    errorHandler,
    notFound,
};
