const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const { validateJoi } = require('../../../shared/middleware/validate.middleware');
const { authLimiter, passwordResetLimiter } = require('../../../shared/middleware/rateLimiter.middleware');

const {
    signupSchema,
    loginSchema,
    emailSchema,
    passwordResetSchema,
    verifyEmailSchema,
} = require('../validators/auth.validator');

/**
 * Authentication Routes
 * Base path: /api/v1/candidates/auth
 */

// Public routes
router.post(
    '/signup',
    authLimiter,
    validateJoi(signupSchema, 'body'),
    authController.signup
);

router.post(
    '/login',
    authLimiter,
    validateJoi(loginSchema, 'body'),
    authController.login
);

router.post(
    '/refresh',
    authController.refreshToken
);

router.get(
    '/verify-email/:token',
    validateJoi(verifyEmailSchema, 'params'),
    authController.verifyEmail
);

router.post(
    '/resend-verification',
    authLimiter,
    validateJoi(emailSchema, 'body'),
    authController.resendVerification
);

router.post(
    '/forgot-password',
    passwordResetLimiter,
    validateJoi(emailSchema, 'body'),
    authController.forgotPassword
);

router.post(
    '/reset-password',
    passwordResetLimiter,
    validateJoi(passwordResetSchema, 'body'),
    authController.resetPassword
);

// Protected routes
router.post(
    '/logout',
    authenticate,
    authController.logout
);

router.post(
    '/logout-all',
    authenticate,
    authController.logoutAll
);

router.get(
    '/me',
    authenticate,
    authController.getCurrentUser
);

module.exports = router;
