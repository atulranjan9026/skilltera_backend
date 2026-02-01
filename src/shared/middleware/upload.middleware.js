const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');
const { ERROR_MESSAGES } = require('../constants');

// Configure storage (memory storage for cloud uploads)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(ApiError.badRequest(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
    }
};

// Configure multer
const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    },
    fileFilter,
});

/**
 * Middleware for single file upload
 * @param {string} fieldName - Form field name
 */
const uploadSingle = (fieldName) => upload.single(fieldName);

/**
 * Middleware for multiple files upload
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Maximum number of files
 */
const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

/**
 * Middleware for multiple fields with files
 * @param {Array} fields - Array of {name, maxCount} objects
 */
const uploadFields = (fields) => upload.fields(fields);

/**
 * Middleware for any files
 */
const uploadAny = () => upload.any();

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    uploadFields,
    uploadAny,
};
