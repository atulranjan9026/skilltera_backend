const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const HTTP_STATUS = require('../constants/httpStatus');

/**
 * Middleware to validate request using express-validator
 * Checks validation results and throws error if validation fails
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: error.path || error.param,
            message: error.msg,
        }));

        const error = new ApiError(
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            'Validation failed',
            true
        );
        error.errors = errorMessages;

        throw error;
    }

    next();
};

/**
 * Middleware to validate request using Joi schema
 * @param {object} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, params, query)
 */
const validateJoi = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Return all errors
            stripUnknown: true, // Remove unknown fields
        });

        if (error) {
            const errorMessages = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            const apiError = new ApiError(
                HTTP_STATUS.UNPROCESSABLE_ENTITY,
                'Validation failed',
                true
            );
            apiError.errors = errorMessages;

            throw apiError;
        }

        // Replace request property with validated value
        req[property] = value;
        next();
    };
};

module.exports = {
    validate,
    validateJoi,
};
