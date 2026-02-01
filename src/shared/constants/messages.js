/**
 * Success Messages
 */
const SUCCESS_MESSAGES = {
    // Auth
    SIGNUP_SUCCESS: 'Account created successfully. Please verify your email.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    EMAIL_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET_EMAIL_SENT: 'Password reset email sent successfully',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    TOKEN_REFRESHED: 'Token refreshed successfully',

    // Profile
    PROFILE_UPDATED: 'Profile updated successfully',
    PROFILE_FETCHED: 'Profile fetched successfully',

    // Skills
    SKILL_ADDED: 'Skill added successfully',
    SKILL_UPDATED: 'Skill updated successfully',
    SKILL_DELETED: 'Skill deleted successfully',

    // Experience
    EXPERIENCE_ADDED: 'Experience added successfully',
    EXPERIENCE_UPDATED: 'Experience updated successfully',
    EXPERIENCE_DELETED: 'Experience deleted successfully',

    // Education
    EDUCATION_ADDED: 'Education added successfully',
    EDUCATION_UPDATED: 'Education updated successfully',
    EDUCATION_DELETED: 'Education deleted successfully',

    // Certificates
    CERTIFICATE_ADDED: 'Certificate added successfully',
    CERTIFICATE_UPDATED: 'Certificate updated successfully',
    CERTIFICATE_DELETED: 'Certificate deleted successfully',

    // Resume
    RESUME_UPLOADED: 'Resume uploaded successfully',
    RESUME_DELETED: 'Resume deleted successfully',
    RESUME_PARSED: 'Resume parsed successfully',

    // Jobs
    JOB_SAVED: 'Job saved successfully',
    JOB_UNSAVED: 'Job removed from saved list',

    // Applications
    APPLICATION_SUBMITTED: 'Application submitted successfully',
    APPLICATION_WITHDRAWN: 'Application withdrawn successfully',
};

/**
 * Error Messages
 */
const ERROR_MESSAGES = {
    // Auth
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_EXISTS: 'Email already registered',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
    INVALID_TOKEN: 'Invalid or expired token',
    TOKEN_EXPIRED: 'Token has expired',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'You do not have permission to perform this action',

    // Validation
    MISSING_FIELDS: 'Required fields are missing',
    INVALID_EMAIL: 'Invalid email format',
    WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
    INVALID_INPUT: 'Invalid input data',

    // Resources
    USER_NOT_FOUND: 'User not found',
    JOB_NOT_FOUND: 'Job not found',
    APPLICATION_NOT_FOUND: 'Application not found',
    RESOURCE_NOT_FOUND: 'Resource not found',

    // Applications
    ALREADY_APPLIED: 'You have already applied to this job',
    APPLICATION_CLOSED: 'Applications for this job are closed',

    // File Upload
    FILE_TOO_LARGE: 'File size exceeds the maximum limit',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_UPLOAD_FAILED: 'File upload failed',

    // Server
    SERVER_ERROR: 'Internal server error. Please try again later.',
    DATABASE_ERROR: 'Database operation failed',

    // Rate Limiting
    TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
};

/**
 * Validation Messages
 */
const VALIDATION_MESSAGES = {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please provide a valid email address',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long',
    PASSWORD_PATTERN: 'Password must contain uppercase, lowercase, number and special character',
    NAME_REQUIRED: 'Name is required',
    NAME_MIN_LENGTH: 'Name must be at least 2 characters long',
    PHONE_INVALID: 'Please provide a valid phone number',
};

module.exports = {
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
    VALIDATION_MESSAGES,
};
