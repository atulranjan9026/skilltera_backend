const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');
const { ERROR_MESSAGES } = require('../constants');

/**
 * Token Manager for JWT operations
 */
class TokenManager {
    /**
     * Generate access token
     * @param {object} payload - Token payload (userId, email, role)
     * @returns {string} JWT access token
     */
    static generateAccessToken(payload) {
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
        });
    }

    /**
     * Generate refresh token
     * @param {object} payload - Token payload (userId)
     * @returns {string} JWT refresh token
     */
    static generateRefreshToken(payload) {
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
        });
    }

    /**
     * Generate both access and refresh tokens
     * @param {object} user - User object
     * @returns {object} Object containing accessToken and refreshToken
     */
    static generateTokenPair(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role || 'candidate',
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken({ userId: user._id });

        return { accessToken, refreshToken };
    }

    /**
     * Verify access token
     * @param {string} token - JWT access token
     * @returns {object} Decoded token payload
     * @throws {ApiError} If token is invalid or expired
     */
    static verifyAccessToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_EXPIRED);
            }
            throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
        }
    }

    /**
     * Verify refresh token
     * @param {string} token - JWT refresh token
     * @returns {object} Decoded token payload
     * @throws {ApiError} If token is invalid or expired
     */
    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw ApiError.unauthorized(ERROR_MESSAGES.TOKEN_EXPIRED);
            }
            throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
        }
    }

    /**
     * Generate email verification token
     * @param {string} userId - User ID
     * @returns {string} Email verification token
     */
    static generateEmailVerificationToken(userId) {
        return jwt.sign(
            { userId, type: 'email_verification' },
            process.env.JWT_EMAIL_VERIFICATION_SECRET,
            { expiresIn: process.env.JWT_EMAIL_VERIFICATION_EXPIRY || '24h' }
        );
    }

    /**
     * Verify email verification token
     * @param {string} token - Email verification token
     * @returns {object} Decoded token payload
     * @throws {ApiError} If token is invalid or expired
     */
    static verifyEmailVerificationToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_EMAIL_VERIFICATION_SECRET);
            if (decoded.type !== 'email_verification') {
                throw new Error('Invalid token type');
            }
            return decoded;
        } catch (error) {
            throw ApiError.badRequest(ERROR_MESSAGES.INVALID_TOKEN);
        }
    }

    /**
     * Generate password reset token
     * @param {string} userId - User ID
     * @returns {string} Password reset token
     */
    static generatePasswordResetToken(userId) {
        return jwt.sign(
            { userId, type: 'password_reset' },
            process.env.JWT_PASSWORD_RESET_SECRET,
            { expiresIn: process.env.JWT_PASSWORD_RESET_EXPIRY || '1h' }
        );
    }

    /**
     * Verify password reset token
     * @param {string} token - Password reset token
     * @returns {object} Decoded token payload
     * @throws {ApiError} If token is invalid or expired
     */
    static verifyPasswordResetToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_PASSWORD_RESET_SECRET);
            if (decoded.type !== 'password_reset') {
                throw new Error('Invalid token type');
            }
            return decoded;
        } catch (error) {
            throw ApiError.badRequest(ERROR_MESSAGES.INVALID_TOKEN);
        }
    }

    /**
     * Decode token without verification (for debugging)
     * @param {string} token - JWT token
     * @returns {object} Decoded token payload
     */
    static decode(token) {
        return jwt.decode(token);
    }
}

module.exports = TokenManager;
