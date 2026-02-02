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
        experienceLevel: req.query.experienceLevel,
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



