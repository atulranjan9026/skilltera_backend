const jobService = require('../services/job.service');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

/**
 * Job Controller
 * Handles HTTP requests for job-related operations
 */

/**
 * @route   GET /api/v1/candidate/job/ranking
 * @desc    Get ranked jobs for candidate with pagination
 * @access  Private
 * @query   page, limit, location, jobType, experienceLevel, minSalary, maxSalary, isRemote
 */
exports.getRankingJobs = asyncHandler(async (req, res) => {
    const candidateId = req.userId; // From auth middleware

    // Extract query parameters
    const options = {
        page: req.query.page,
        limit: req.query.limit,
        location: req.query.location,
        jobTitle: req.query.jobTitle,
        jobType: req.query.jobType,
        experience: req.query.experience,
        minSalary: req.query.minSalary,
        maxSalary: req.query.maxSalary,
        isRemote: req.query.isRemote,
        postedWithin: req.query.postedWithin
    };

    // Get ranked jobs
    const result = await jobService.getRankingJobs(candidateId, options);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Jobs retrieved successfully'
    );

    response.send(res);
});


/**
 * @route   GET /api/v1/candidate/job/suggestions
 * @desc    Get job title/company suggestions
 * @access  Private
 * @query   q (search query), limit
 */
exports.getJobSuggestions = asyncHandler(async (req, res) => {
    const { q: query } = req.query;
    const limit = parseInt(req.query.limit) || 8;

    if (!query) {
        const response = new ApiResponse(
            HTTP_STATUS.BAD_REQUEST,
            null,
            'Search query is required'
        );
        return response.send(res);
    }

    const result = await jobService.getJobSuggestions(query, limit);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Suggestions retrieved successfully'
    );

    response.send(res);
});

/**
 * @route   GET /api/v1/candidate/job/location-suggestions
 * @desc    Get location suggestions
 * @access  Private
 * @query   q (search query), limit
 */
exports.getLocationSuggestions = asyncHandler(async (req, res) => {
    const { q: query } = req.query;
    const limit = parseInt(req.query.limit) || 8;

    if (!query) {
        const response = new ApiResponse(
            HTTP_STATUS.BAD_REQUEST,
            null,
            'Search query is required'
        );
        return response.send(res);
    }

    const result = await jobService.getLocationSuggestions(query, limit);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Location suggestions retrieved successfully'
    );

    response.send(res);
});

/**
 * @route   POST /api/v1/candidate/job/apply/:jobId
 * @desc    Apply for a job
 * @access  Private
 */
exports.applyToJob = asyncHandler(async (req, res) => {
    const candidateId = req.userId; // From auth middleware
    const { jobId } = req.params;
    const applicationData = req.body;

    const application = await jobService.applyForJob(candidateId, jobId, applicationData);

    const response = new ApiResponse(
        HTTP_STATUS.CREATED,
        application,
        'Application submitted successfully'
    );

    response.send(res);
});

/**
 * @route   POST /api/v1/candidate/job/save
 * @desc    Save a job for candidate
 * @access  Private
 * @body    { jobId }
 */
exports.saveJob = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const { jobId } = req.body;

    if (!jobId) {
        const response = new ApiResponse(
            HTTP_STATUS.BAD_REQUEST,
            null,
            'Job ID is required'
        );
        return response.send(res);
    }

    const candidate = await jobService.saveJob(candidateId, jobId);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        candidate,
        'Job saved successfully'
    );

    response.send(res);
});

/**
 * @route   DELETE /api/v1/candidate/job/unsave/:jobId
 * @desc    Remove saved job
 * @access  Private
 * @params  jobId
 */
exports.unsaveJob = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const { jobId } = req.params;

    const candidate = await jobService.unsaveJob(candidateId, jobId);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        candidate,
        'Job removed from saved list'
    );

    response.send(res);
});

/**
 * @route   GET /api/v1/candidate/saved
 * @desc    Get saved jobs for candidate
 * @access  Private
 * @query   page, limit
 */
exports.getSavedJobs = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const options = {
        page: req.query.page,
        limit: req.query.limit
    };

    const result = await jobService.getSavedJobs(candidateId, options);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Saved jobs retrieved successfully'
    );

    response.send(res);
});

/**
 * @route   GET /api/v1/candidates/:candidateId/applications
 * @desc    Get applications for a candidate
 * @access  Private
 * @params  candidateId
 * @query   page, limit, status
 */
exports.getApplications = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { candidateId } = req.params;

    // Ensure user can only access their own applications
    if (userId.toString() !== candidateId.toString()) {
        const response = new ApiResponse(
            HTTP_STATUS.FORBIDDEN,
            null,
            'Unauthorized access'
        );
        return response.send(res);
    }

    const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status
    };

    const result = await jobService.getApplications(candidateId, options);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Applications retrieved successfully'
    );

    response.send(res);
});



