const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const TokenManager = require('../utils/tokenManager');
const { ERROR_MESSAGES } = require('../constants');
const Candidate = require('../../features/candidates/models/candidate.model');
const Company = require('../models/company.model');
const HiringManager = require('../models/hiringManager.model');
const Interviewer = require('../models/interviewer.model');

/**
 * Middleware to authenticate user using JWT
 * Verifies access token and attaches user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = TokenManager.verifyAccessToken(token);

    // Get user based on role
    let user = null;
    const { role } = decoded;

    switch (role) {
        case 'candidate':
            user = await Candidate.findById(decoded.userId)
                .select('-password -refreshTokens')
                .populate('skills.skillId', 'skill name');
            break;
        
        case 'company':
            user = await Company.findById(decoded.userId).select('-password');
            break;
        
        case 'hiring_manager':
            user = await HiringManager.findById(decoded.userId)
                .select('-password')
                .populate({ path: 'companyId', select: 'companyName email' });
            break;
        
        case 'interviewer':
            user = await Interviewer.findById(decoded.userId)
                .select('-password')
                .populate({ path: 'companyId', select: 'companyName email' });
            break;
        
        default:
            throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!user) {
        throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if email is verified (commented out for development)
    // if (!user.emailVerified) {
    //     throw ApiError.forbidden(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    // }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = role;

    next();
});

/**
 * Middleware to optionally authenticate user
 * Attaches user to request if token is present, but doesn't throw error if not
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = TokenManager.verifyAccessToken(token);

            // Get user based on role
            let user = null;
            const { role } = decoded;

            switch (role) {
                case 'candidate':
                    user = await Candidate.findById(decoded.userId).select('-password -refreshTokens');
                    break;
                
                case 'company':
                    user = await Company.findById(decoded.userId).select('-password');
                    break;
                
                case 'hiring_manager':
                    user = await HiringManager.findById(decoded.userId)
                        .select('-password')
                        .populate({ path: 'companyId', select: 'companyName email' });
                    break;
                
                case 'interviewer':
                    user = await Interviewer.findById(decoded.userId)
                        .select('-password')
                        .populate({ path: 'companyId', select: 'companyName email' });
                    break;
            }

            if (user) {
                req.user = user;
                req.userId = user._id;
                req.userRole = role;
            }
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
});

/**
 * Middleware to require authentication
 * Throws error if user is not authenticated
 */
const requireAuth = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }
    next();
});

/**
 * Middleware to check if user has required role(s)
 * @param {...string} roles - Required roles
 */
const requireRole = (...roles) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
        }

        const userRole = req.userRole || req.user.role || 'candidate';

        if (!roles.includes(userRole)) {
            throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
        }

        next();
    });
};

/**
 * Middleware to verify refresh token
 */
const verifyRefreshToken = asyncHandler(async (req, res, next) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
        throw ApiError.unauthorized('Refresh token not found');
    }

    // Verify token
    const decoded = TokenManager.verifyRefreshToken(refreshToken);

    // Get user and check if refresh token exists in database
    let user = null;
    const { role } = decoded;

    switch (role) {
        case 'candidate':
            user = await Candidate.findById(decoded.userId);
            break;
        
        case 'company':
            user = await Company.findById(decoded.userId);
            break;
        
        case 'hiring_manager':
            user = await HiringManager.findById(decoded.userId);
            break;
        
        case 'interviewer':
            user = await Interviewer.findById(decoded.userId);
            break;
    }

    if (!user) {
        throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
        throw ApiError.unauthorized('Invalid refresh token');
    }

    req.user = user;
    req.refreshToken = refreshToken;

    next();
});

module.exports = {
    authenticate,
    optionalAuth,
    requireAuth,
    requireRole,
    verifyRefreshToken,
};
