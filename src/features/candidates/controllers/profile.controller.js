const profileService = require('../services/profile.service');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const { SUCCESS_MESSAGES } = require('../../../shared/constants');

/**
 * Profile Controller
 * Handles HTTP requests for profile management
 */

/**
 * @route   GET /api/v1/candidates/profile
 * @desc    Get candidate profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.getProfile(req.userId);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        profile,
        'Profile fetched successfully'
    );

    response.send(res);
});

/**
 * @route   PATCH /api/v1/candidates/profile
 * @desc    Update candidate profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.updateProfile(req.userId, req.body);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        profile,
        SUCCESS_MESSAGES.PROFILE_UPDATED
    );

    response.send(res);
});

/**
 * @route   POST /api/v1/candidates/profile/avatar
 * @desc    Upload profile avatar
 * @access  Private
 */
exports.uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw ApiError.badRequest('Please upload an image');
    }

    const profile = await profileService.uploadAvatar(req.userId, req.file.buffer);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        profile,
        'Avatar uploaded successfully'
    );

    response.send(res);
});



exports.addSkill = asyncHandler(async (req, res) => {
    const skill = await profileService.addSkill(req.userId, req.body);
    const response = new ApiResponse(HTTP_STATUS.CREATED, skill, SUCCESS_MESSAGES.SKILL_ADDED);
    response.send(res);
});

exports.updateSkill = asyncHandler(async (req, res) => {
    const skill = await profileService.updateSkill(req.userId, req.params.id, req.body);
    const response = new ApiResponse(HTTP_STATUS.OK, skill, SUCCESS_MESSAGES.SKILL_UPDATED);
    response.send(res);
});

exports.deleteSkill = asyncHandler(async (req, res) => {
    await profileService.deleteSkill(req.userId, req.params.id);
    const response = new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.SKILL_DELETED);
    response.send(res);
});

// Experience
exports.addExperience = asyncHandler(async (req, res) => {
    const experience = await profileService.addExperience(req.userId, req.body);
    const response = new ApiResponse(HTTP_STATUS.CREATED, experience, SUCCESS_MESSAGES.EXPERIENCE_ADDED);
    response.send(res);
});

exports.updateExperience = asyncHandler(async (req, res) => {
    const experience = await profileService.updateExperience(req.userId, req.params.id, req.body);
    const response = new ApiResponse(HTTP_STATUS.OK, experience, SUCCESS_MESSAGES.EXPERIENCE_UPDATED);
    response.send(res);
});

exports.deleteExperience = asyncHandler(async (req, res) => {
    await profileService.deleteExperience(req.userId, req.params.id);
    const response = new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.EXPERIENCE_DELETED);
    response.send(res);
});

// Education
exports.addEducation = asyncHandler(async (req, res) => {
    const education = await profileService.addEducation(req.userId, req.body);
    const response = new ApiResponse(HTTP_STATUS.CREATED, education, SUCCESS_MESSAGES.EDUCATION_ADDED);
    response.send(res);
});

exports.updateEducation = asyncHandler(async (req, res) => {
    const education = await profileService.updateEducation(req.userId, req.params.id, req.body);
    const response = new ApiResponse(HTTP_STATUS.OK, education, SUCCESS_MESSAGES.EDUCATION_UPDATED);
    response.send(res);
});

exports.deleteEducation = asyncHandler(async (req, res) => {
    await profileService.deleteEducation(req.userId, req.params.id);
    const response = new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.EDUCATION_DELETED);
    response.send(res);
});

// Certificates
exports.addCertificate = asyncHandler(async (req, res) => {
    const certificate = await profileService.addCertificate(req.userId, req.body);
    const response = new ApiResponse(HTTP_STATUS.CREATED, certificate, SUCCESS_MESSAGES.CERTIFICATE_ADDED);
    response.send(res);
});

exports.updateCertificate = asyncHandler(async (req, res) => {
    const certificate = await profileService.updateCertificate(req.userId, req.params.id, req.body);
    const response = new ApiResponse(HTTP_STATUS.OK, certificate, SUCCESS_MESSAGES.CERTIFICATE_UPDATED);
    response.send(res);
});

exports.deleteCertificate = asyncHandler(async (req, res) => {
    await profileService.deleteCertificate(req.userId, req.params.id);
    const response = new ApiResponse(HTTP_STATUS.OK, null, SUCCESS_MESSAGES.CERTIFICATE_DELETED);
    response.send(res);
});

// Resume
exports.uploadResume = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw ApiError.badRequest('Please upload a resume file');
    }

    const profile = await profileService.uploadResume(
        req.userId,
        req.file.buffer,
        req.file.originalname
    );

    const response = new ApiResponse(HTTP_STATUS.OK, profile, SUCCESS_MESSAGES.RESUME_UPLOADED);
    response.send(res);
});

exports.deleteResume = asyncHandler(async (req, res) => {
    const profile = await profileService.deleteResume(req.userId);
    const response = new ApiResponse(HTTP_STATUS.OK, profile, SUCCESS_MESSAGES.RESUME_DELETED);
    response.send(res);
});
