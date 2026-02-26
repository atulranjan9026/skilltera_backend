const bcrypt = require('bcrypt');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const ApiError = require('../../../shared/utils/ApiError');
const TokenManager = require('../../../shared/utils/tokenManager');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../shared/constants');

const Company = require('../../../shared/models/company.model');
const HiringManager = require('../../../shared/models/hiringManager.model');
const Interviewer = require('../../../shared/models/interviewer.model');
const Job = require('../../../shared/models/job.model');
const Candidate = require('../../candidates/models/candidate.model');

/**
 * Company Signup
 * @route   POST /api/v1/company/auth/signup
 * @access  Public
 */
exports.companySignup = asyncHandler(async (req, res) => {
    let { companyName, email, password } = req.body;

    if (!companyName || !email || !password) {
        throw ApiError.badRequest(ERROR_MESSAGES.MISSING_FIELDS);
    }

    email = email.toLowerCase().trim();

    const existing = await Company.findOne({ email });
    if (existing) {
        throw ApiError.conflict('Email already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const company = await Company.create({
        companyName,
        email,
        password: hashedPassword,
        registrationDate: new Date(),
        isApproved: false,
    });

    const tokenPayload = { userId: company._id, email: company.email, role: 'company' };
    const accessToken = TokenManager.generateAccessToken(tokenPayload);
    const refreshToken = TokenManager.generateRefreshToken({ userId: company._id });

    const companyData = await Company.findById(company._id).select('-password');

    return new ApiResponse(
        HTTP_STATUS.CREATED,
        { accessToken, refreshToken, user: { ...companyData.toObject(), role: 'company' } },
        'Company registered successfully'
    ).send(res);
});

/**
 * Unified Company Login
 * Supports: Company Admin, Hiring Manager, and Interviewer roles.
 * @route   POST /api/v1/company/auth/login
 * @access  Public
 */
exports.companyLogin = asyncHandler(async (req, res) => {
    let { companyName, email, password } = req.body;

    if (!companyName || !email || !password) {
        throw ApiError.badRequest(ERROR_MESSAGES.MISSING_FIELDS);
    }

    email = email.toLowerCase().trim();

    const company = await Company.findOne({ companyName });
    if (!company) {
        throw ApiError.unauthorized('Company not found. Please check your company name.');
    }
    const companyId = company._id;

    let user = null;
    let role = null;
    let userData = null;

    // 1. Try Company Admin login
    try {
        const companyUser = await Company.login(companyName, email, password);
        if (companyUser && companyUser._id.toString() === companyId.toString()) {
            user = companyUser;
            role = 'company';
            userData = await Company.findById(companyUser._id).select('-password');
        }
    } catch (_) { /* Fall through */ }

    // 2. Try Hiring Manager login
    if (!user) {
        try {
            const hiringManager = await HiringManager.login(email, password);
            if (hiringManager && hiringManager.companyId.toString() === companyId.toString()) {
                user = hiringManager;
                role = 'hiring_manager';
                userData = await HiringManager.findById(hiringManager._id)
                    .select('-password')
                    .populate({ path: 'companyId', select: 'companyName email' });
            }
        } catch (_) { /* Fall through */ }
    }

    // 3. Try Interviewer login
    if (!user) {
        try {
            const interviewer = await Interviewer.login(email, password);
            if (interviewer && interviewer.companyId.toString() === companyId.toString()) {
                const loginTime = new Date();
                await Interviewer.updateOne(
                    { _id: interviewer._id },
                    { $set: { lastLoginDate: loginTime, lastLoginTime: loginTime } }
                );
                user = interviewer;
                role = 'interviewer';
                userData = await Interviewer.findById(interviewer._id)
                    .select('-password')
                    .populate({ path: 'companyId', select: 'companyName email' });
            }
        } catch (_) { /* All models exhausted */ }
    }

    if (!user || !role) {
        throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const tokenPayload = { userId: user._id, email: userData.email, role };
    const accessToken = TokenManager.generateAccessToken(tokenPayload);
    const refreshToken = TokenManager.generateRefreshToken({ userId: user._id });

    return new ApiResponse(
        HTTP_STATUS.OK,
        { accessToken, refreshToken, user: { ...userData.toObject(), role } },
        SUCCESS_MESSAGES.LOGIN_SUCCESS
    ).send(res);
});

/**
 * Get Company Jobs
 * @route   GET /api/v1/company/:companyId/jobs
 * @access  Private (Company Admin/Hiring Manager)
 */
exports.getCompanyJobs = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { page = 1, limit = 10, status, active } = req.query;

    // Validate company exists
    const company = await Company.findById(companyId);
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    // Build query
    const query = { companyId };
    
    if (status) {
        query.status = status;
    }
    
    if (active !== undefined) {
        query.active = active === 'true';
    }

    const skip = (page - 1) * limit;
    
    const jobs = await Job.find(query)
        .sort({ postedOn: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('companyId', 'companyName email')
        .lean();

    const total = await Job.countDocuments(query);

    return new ApiResponse(
        HTTP_STATUS.OK,
        {
            jobs,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalJobs: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        },
        'Company jobs retrieved successfully'
    ).send(res);
});

/**
 * Get Company Applications
 * @route   GET /api/v1/company/:companyId/applications
 * @access  Private (Company Admin/Hiring Manager)
 */
exports.getCompanyApplications = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { page = 1, limit = 10, status, jobId } = req.query;

    // Validate company exists
    const company = await Company.findById(companyId);
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    // Get all jobs for this company
    const companyJobs = await Job.find({ companyId }).select('_id').lean();
    const jobIds = companyJobs.map(job => job._id);

    if (jobIds.length === 0) {
        return new ApiResponse(
            HTTP_STATUS.OK,
            {
                applications: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalApplications: 0,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            },
            'No applications found - company has no jobs'
        ).send(res);
    }

    // Build query for candidates with applications to company jobs
    const query = { 
        'applications.jobId': { $in: jobIds }
    };

    if (status) {
        query['applications.status'] = status;
    }

    if (jobId) {
        query['applications.jobId'] = jobId;
    }

    const skip = (page - 1) * limit;

    const candidates = await Candidate.find(query)
        .select('name email phone applications')
        .populate('applications.jobId', 'jobTitle jobType companyId')
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // Extract and format applications
    const applications = [];
    candidates.forEach(candidate => {
        candidate.applications.forEach(app => {
            if (jobIds.includes(app.jobId._id.toString())) {
                applications.push({
                    _id: app._id,
                    candidate: {
                        _id: candidate._id,
                        name: candidate.name,
                        email: candidate.email,
                        phone: candidate.phone
                    },
                    job: app.jobId,
                    appliedAt: app.appliedAt,
                    status: app.status
                });
            }
        });
    });

    // Sort by applied date
    applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    const total = await Candidate.countDocuments(query);

    return new ApiResponse(
        HTTP_STATUS.OK,
        {
            applications,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalApplications: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        },
        'Company applications retrieved successfully'
    ).send(res);
});