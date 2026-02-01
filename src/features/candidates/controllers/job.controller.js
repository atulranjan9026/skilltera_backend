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
        jobType: req.query.jobType,
        experienceLevel: req.query.experienceLevel,
        minSalary: req.query.minSalary,
        maxSalary: req.query.maxSalary,
        isRemote: req.query.isRemote
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
 * @route   GET /api/v1/candidate/job/:jobId
 * @desc    Get job details by ID
 * @access  Private
 */
exports.getJobById = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    // Increment view count
    await jobService.incrementJobViews(jobId);

    // Get job details
    const job = await jobService.getJobById(jobId);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        job,
        'Job details retrieved successfully'
    );

    response.send(res);
});

/**
 * @route   GET /api/v1/candidate/job/search
 * @desc    Search jobs by text query
 * @access  Private
 * @query   q (search query), page, limit
 */
exports.searchJobs = asyncHandler(async (req, res) => {
    const { q: query } = req.query;

    if (!query) {
        const response = new ApiResponse(
            HTTP_STATUS.BAD_REQUEST,
            null,
            'Search query is required'
        );
        return response.send(res);
    }

    const options = {
        page: req.query.page,
        limit: req.query.limit
    };

    const result = await jobService.searchJobs(query, options);

    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Search results retrieved successfully'
    );

    response.send(res);
});
