const { OAuth2Client } = require('google-auth-library');
const Candidate = require('../models/candidate.model');
const TokenManager = require('../../../shared/utils/tokenManager');
const emailService = require('../../../shared/utils/emailService');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../shared/constants');
const logger = require('../../../shared/utils/logger');

const getGoogleClient = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        throw ApiError.internal('Google OAuth is not configured');
    }
    return new OAuth2Client(clientId);
};

/**
 * Authentication Service
 * Contains business logic for authentication operations
 */
class AuthService {
    /**
     * Create a new candidate account
     * @param {object} candidateData - Candidate registration data
     * @returns {Promise<object>} Created candidate and tokens
     */
    async createCandidate(candidateData) {
        const { email, password, name, phone } = candidateData;

        // Check if candidate already exists
        const existingCandidate = await Candidate.findOne({ email });
        if (existingCandidate) {
            throw ApiError.conflict(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        // Create candidate
        const candidate = await Candidate.create({
            email,
            password,
            name,
            phone,
        });

        // Generate email verification token
        const verificationToken = TokenManager.generateEmailVerificationToken(candidate._id);
        candidate.emailVerificationToken = verificationToken;
        await candidate.save();

        // Send verification email
        try {
            await emailService.sendVerificationEmail(email, name, verificationToken);
            logger.info(`Verification email sent to ${email}`);
        } catch (error) {
            logger.error(`Failed to send verification email to ${email}:`, error);
            // Don't throw error, account is created successfully
        }

        // Remove password from response
        const candidateObject = candidate.toObject();
        delete candidateObject.password;
        delete candidateObject.emailVerificationToken;

        return {
            candidate: candidateObject,
            message: SUCCESS_MESSAGES.SIGNUP_SUCCESS,
        };
    }

    /**
     * Authenticate candidate and generate tokens
     * @param {string} email - Candidate email
     * @param {string} password - Candidate password
     * @returns {Promise<object>} Candidate and tokens
     */
    async authenticateCandidate(email, password) {
        console.log('🔍 Authentication attempt for email:', email);

        // Find candidate with password field
        console.log('🔍 Searching for candidate in database...');
        const candidate = await Candidate.findOne({ email })
            .select('+password')
            .populate('skills.skillId', 'skill name');
        // console.log("candidate Skills : ", candidate.skills);
        // console.log('🔍 Candidate found:', !!candidate);

        if (!candidate) {
            throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
        }

        // console.log('🔍 Comparing password...');
        // Check password
        const isPasswordValid = await candidate.comparePassword(password);
        // console.log('🔍 Password valid:', isPasswordValid);

        if (!isPasswordValid) {
            throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
        }

        // Check if email is verified
        // if (!candidate.emailVerified) {
        //     throw ApiError.forbidden(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
        // }

        // Generate tokens
        const { accessToken, refreshToken } = TokenManager.generateTokenPair(candidate);

        // Save refresh token
        // Save refresh token
        // Use updateOne to avoid validation errors on legacy data
        await Candidate.updateOne(
            { _id: candidate._id },
            {
                $push: {
                    refreshTokens: {
                        $each: [refreshToken],
                        $slice: -5 // Keep last 5 tokens
                    }
                },
                $set: { lastLogin: new Date() }
            }
        );

        // Remove sensitive data
        const candidateObject = candidate.toObject();
        delete candidateObject.password;
        delete candidateObject.refreshTokens;
        delete candidateObject.emailVerificationToken;

        // Transform skills array - Handle both populated and unpopulated cases
        if (candidateObject.skills && Array.isArray(candidateObject.skills)) {
            candidateObject.skills = candidateObject.skills.map(skill => {
                // console.log('skill,,,,', skill);
                // Handle populated skillId (object)
                if (skill.skillId && typeof skill.skillId === 'object') {
                    return {
                        skillId: skill.skillId._id,  // Keep the ID for updates/deletes
                        skillName: skill.skillId.skill, // The actual skill name
                        experience: skill.experience || 0,
                        rating: skill.rating || 0,
                        isVerified: skill.isVerified || false
                    };
                }

                // Handle unpopulated skillId (just ObjectId)
                return {
                    skillId: skill.skillId,
                    skillName: null, // Will need to populate separately
                    experience: skill.experience || 0,
                    rating: skill.rating || 0,
                    isVerified: skill.isVerified || false
                };
            });
        }

        return {
            candidate: candidateObject,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Authenticate with Google credential (ID token)
     * @param {string} credential - Google ID token from frontend
     * @returns {Promise<object>} Candidate and tokens
     */
    async authenticateWithGoogle(credential) {
        if (!credential) {
            throw ApiError.badRequest('Google credential is required');
        }

        let payload;
        try {
            const client = getGoogleClient();
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (error) {
            logger.error('Google token verification failed:', error);
            throw ApiError.unauthorized('Invalid Google credential');
        }

        const { sub: googleId, email, name, given_name, family_name, picture } = payload;
        if (!email) {
            throw ApiError.badRequest('Email not provided by Google');
        }

        let displayName = name || [given_name, family_name].filter(Boolean).join(' ') || email?.split('@')[0] || 'User';
        if (displayName.trim().length < 2) displayName = 'User'; // Model requires min 2 chars

        // Find by googleId first, then by email (for account linking)
        let candidate = await Candidate.findOne({ googleId })
            .populate('skills.skillId', 'skill name');

        if (!candidate) {
            candidate = await Candidate.findOne({ email })
                .populate('skills.skillId', 'skill name');
        }

        if (!candidate) {
            // Create new candidate
            candidate = await Candidate.create({
                googleId,
                email,
                name: displayName,
                authProvider: 'google',
                emailVerified: true,
                overallExperience: 0,
                avatar: picture ? { url: picture } : undefined,
            });
        } else {
            // Link googleId to existing account if not already linked
            if (!candidate.googleId) {
                candidate.googleId = googleId;
                candidate.authProvider = 'google';
                candidate.emailVerified = true;
                if (picture && !candidate.avatar?.url) {
                    candidate.avatar = { url: picture };
                }
                // Ensure name is set (existing account may have empty name)
                if (!candidate.name || candidate.name.trim().length < 2) {
                    candidate.name = displayName;
                    candidate.markModified('name');
                }
                // Ensure overallExperience is a valid number (handles corrupt DB data)
                if (typeof candidate.overallExperience !== 'number' || isNaN(candidate.overallExperience)) {
                    candidate.overallExperience = 0;
                    candidate.markModified('overallExperience');
                }
                await candidate.save();
            }
        }

        // Generate tokens
        const { accessToken, refreshToken } = TokenManager.generateTokenPair(candidate);

        await Candidate.updateOne(
            { _id: candidate._id },
            {
                $push: {
                    refreshTokens: {
                        $each: [refreshToken],
                        $slice: -5,
                    },
                },
                $set: { lastLogin: new Date() },
            }
        );

        const candidateObject = candidate.toObject();
        delete candidateObject.password;
        delete candidateObject.refreshTokens;
        delete candidateObject.emailVerificationToken;

        if (candidateObject.skills && Array.isArray(candidateObject.skills)) {
            candidateObject.skills = candidateObject.skills.map((skill) => ({
                id: skill._id || skill.id,
                experience: skill.experience,
                rating: skill.rating,
                skillName: skill.skillId?.skill || skill.skillId?.name || skill.skillId?.skillName || null,
                isVerified: skill.isVerified,
            }));
        }

        return {
            candidate: candidateObject,
            accessToken,
            refreshToken,
        };
    }

    /**
     * Verify email address
     * @param {string} token - Email verification token
     * @returns {Promise<object>} Success message
     */
    async verifyEmail(token) {
        // Verify token
        const decoded = TokenManager.verifyEmailVerificationToken(token);

        // Find candidate
        const candidate = await Candidate.findById(decoded.userId);
        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check if already verified
        if (candidate.emailVerified) {
            return { message: 'Email already verified' };
        }

        // Verify email
        candidate.emailVerified = true;
        candidate.emailVerificationToken = undefined;
        await candidate.save();

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(candidate.email, candidate.name);
        } catch (error) {
            logger.error(`Failed to send welcome email to ${candidate.email}:`, error);
        }

        return { message: SUCCESS_MESSAGES.EMAIL_VERIFIED };
    }

    /**
     * Resend verification email
     * @param {string} email - Candidate email
     * @returns {Promise<object>} Success message
     */
    async resendVerificationEmail(email) {
        const candidate = await Candidate.findOne({ email });

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (candidate.emailVerified) {
            throw ApiError.badRequest('Email already verified');
        }

        // Generate new verification token
        const verificationToken = TokenManager.generateEmailVerificationToken(candidate._id);
        candidate.emailVerificationToken = verificationToken;
        await candidate.save();

        // Send verification email
        await emailService.sendVerificationEmail(email, candidate.name, verificationToken);

        return { message: 'Verification email sent successfully' };
    }

    /**
     * Request password reset
     * @param {string} email - Candidate email
     * @returns {Promise<object>} Success message
     */
    async requestPasswordReset(email) {
        const candidate = await Candidate.findOne({ email });

        if (!candidate) {
            // Don't reveal if email exists
            return { message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT };
        }

        // Generate password reset token
        const resetToken = TokenManager.generatePasswordResetToken(candidate._id);
        candidate.passwordResetToken = resetToken;
        candidate.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await candidate.save();

        // Send password reset email
        try {
            await emailService.sendPasswordResetEmail(email, candidate.name, resetToken);
        } catch (error) {
            logger.error(`Failed to send password reset email to ${email}:`, error);
            throw ApiError.internal('Failed to send password reset email');
        }

        return { message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT };
    }

    /**
     * Reset password
     * @param {string} token - Password reset token
     * @param {string} newPassword - New password
     * @returns {Promise<object>} Success message
     */
    async resetPassword(token, newPassword) {
        // Verify token
        const decoded = TokenManager.verifyPasswordResetToken(token);

        // Find candidate
        const candidate = await Candidate.findById(decoded.userId);
        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check if token is still valid
        if (!candidate.isPasswordResetTokenValid()) {
            throw ApiError.badRequest('Password reset token has expired');
        }

        // Update password
        candidate.password = newPassword;
        candidate.passwordResetToken = undefined;
        candidate.passwordResetExpires = undefined;

        // Clear all refresh tokens (logout from all devices)
        candidate.clearRefreshTokens();

        await candidate.save();

        return { message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS };
    }

    /**
     * Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<object>} New access token
     */
    async refreshAccessToken(refreshToken) {
        // Verify refresh token
        const decoded = TokenManager.verifyRefreshToken(refreshToken);

        // Find candidate
        const candidate = await Candidate.findById(decoded.userId);
        if (!candidate) {
            throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check if refresh token exists in database
        if (!candidate.refreshTokens || !candidate.refreshTokens.includes(refreshToken)) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        // Generate new access token
        const accessToken = TokenManager.generateAccessToken({
            userId: candidate._id,
            email: candidate.email,
            role: candidate.role,
        });

        return { accessToken };
    }

    /**
     * Logout candidate
     * @param {string} refreshToken - Refresh token to invalidate
     * @param {string} userId - Candidate ID
     * @returns {Promise<object>} Success message
     */
    async logout(refreshToken, userId) {
        if (refreshToken) {
            // Remove specific refresh token using updateOne to avoid validation
            await Candidate.updateOne(
                { _id: userId },
                { $pull: { refreshTokens: refreshToken } }
            );
        } else {
            // Clear all refresh tokens if no specific token provided
            await Candidate.updateOne(
                { _id: userId },
                { $set: { refreshTokens: [] } }
            );
        }

        return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
    }

    /**
     * Logout from all devices
     * @param {string} userId - Candidate ID
     * @returns {Promise<object>} Success message
     */
    async logoutAll(userId) {
        // Use updateOne to avoid validation errors on legacy data
        await Candidate.updateOne(
            { _id: userId },
            { $set: { refreshTokens: [] } }
        );

        return { message: 'Logged out from all devices successfully' };
    }
}

module.exports = new AuthService();
