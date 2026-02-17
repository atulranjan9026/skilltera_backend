const authService = require('../services/auth.service');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

/**
 * @route   POST /api/v1/candidates/auth/signup
 * @desc    Register a new candidate
 * @access  Public
 */
exports.signup = asyncHandler(async (req, res) => {
    const result = await authService.createCandidate(req.body);

    const response = new ApiResponse(
        HTTP_STATUS.CREATED,
        result.candidate,
        result.message
    );

    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/login
 * @desc    Login candidate
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.authenticateCandidate(email, password);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        {
            candidate: result.candidate,
            accessToken: result.accessToken,
        },
        'Login successful'
    );

    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/logout
 * @desc    Logout candidate
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
        await authService.logout(refreshToken, req.userId);
    } else {
        await authService.logoutAll(req.userId);
    }

    res.clearCookie('refreshToken');
    const response = new ApiResponse(HTTP_STATUS.OK, null, 'Logout successful');
    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
exports.logoutAll = asyncHandler(async (req, res) => {
    await authService.logoutAll(req.userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        null,
        'Logged out from all devices successfully'
    );
    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const result = await authService.refreshAccessToken(refreshToken);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        { accessToken: result.accessToken },
        'Token refreshed successfully'
    );

    response.send(res);
});

/**
 * @route   GET /api/v1/candidates/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const result = await authService.verifyEmail(token);

    const response = new ApiResponse(HTTP_STATUS.OK, null, result.message);
    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
exports.resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.resendVerificationEmail(email);

    const response = new ApiResponse(HTTP_STATUS.OK, null, result.message);
    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    const response = new ApiResponse(HTTP_STATUS.OK, null, result.message);
    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    const response = new ApiResponse(HTTP_STATUS.OK, null, result.message);
    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/auth/google
 * @desc    Authenticate with Google credential
 * @access  Public
 */
exports.googleAuth = asyncHandler(async (req, res) => {
    const { credential } = req.body;
    const result = await authService.authenticateWithGoogle(credential);

    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        {
            candidate: result.candidate,
            accessToken: result.accessToken,
        },
        'Login successful'
    );

    response.send(res);
});

/**
 * @route   GET /api/v1/candidates/auth/me
 * @desc    Get current user
 * @access  Private
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
    const response = new ApiResponse(
        HTTP_STATUS.OK,
        req.user,
        'User fetched successfully'
    );
    response.send(res);
});
