const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Custom API Error class for consistent error handling
 * @extends Error
 */
class ApiError extends Error {
    /**
     * Create an API Error
     * @param {number} statusCode - HTTP status code
     * @param {string} message - Error message
     * @param {boolean} isOperational - Whether error is operational (true) or programming error (false)
     * @param {string} stack - Error stack trace
     */
    constructor(
        statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message = 'Internal Server Error',
        isOperational = true,
        stack = ''
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Create a Bad Request error (400)
     */
    static badRequest(message = 'Bad Request') {
        return new ApiError(HTTP_STATUS.BAD_REQUEST, message);
    }

    /**
     * Create an Unauthorized error (401)
     */
    static unauthorized(message = 'Unauthorized') {
        return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
    }

    /**
     * Create a Forbidden error (403)
     */
    static forbidden(message = 'Forbidden') {
        return new ApiError(HTTP_STATUS.FORBIDDEN, message);
    }

    /**
     * Create a Not Found error (404)
     */
    static notFound(message = 'Resource not found') {
        return new ApiError(HTTP_STATUS.NOT_FOUND, message);
    }

    /**
     * Create a Conflict error (409)
     */
    static conflict(message = 'Conflict') {
        return new ApiError(HTTP_STATUS.CONFLICT, message);
    }

    /**
     * Create an Unprocessable Entity error (422)
     */
    static unprocessableEntity(message = 'Unprocessable Entity') {
        return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message);
    }

    /**
     * Create an Internal Server Error (500)
     */
    static internal(message = 'Internal Server Error') {
        return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, false);
    }
}

module.exports = ApiError;
