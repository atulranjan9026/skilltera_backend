const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
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
const { ObjectId } = require('mongodb');
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

    // console.log('--- getCompanyJobs START ---');
    console.log('Params  :', { companyId });
    console.log('Query   :', { page, limit, status, active });

    // Validate company exists
    const company = await Company.findById(companyId);
    // console.log('Company found:', company ? `${company.companyName} (${company._id})` : 'NOT FOUND');
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    // Build query - adjust for actual data structure
    const query = { companyId };
    if (status)               query.status = status;
    if (active !== undefined) query.active = active === 'true';
    // console.log('DB query:', JSON.stringify(query));

    const skip = (page - 1) * limit;
    // console.log('Pagination:', { page, limit, skip });

    // Query using raw MongoDB collection to match actual data structure
    const jobList = await mongoose.connection.db.collection('jobs')
        .find(query)
        .sort({ postedOn: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

    const total = await mongoose.connection.db.collection('jobs').countDocuments(query);

    // console.log(`Jobs fetched: ${jobList.length} of ${total} total`);
    // console.log('Job IDs:', jobList.map(j => j._id));
    // console.log('--- getCompanyJobs END ---');

    return new ApiResponse(
        HTTP_STATUS.OK,
        {
            jobs: jobList,
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

    console.log('--- getCompanyApplications START ---');
    console.log('Params  :', { companyId });
    console.log('Query   :', { page, limit, status, jobId });

    const company = await Company.findById(companyId);
    console.log('Company found:', company ? `${company.companyName} (${company._id})` : 'NOT FOUND');
    if (!company) throw ApiError.notFound('Company not found');

    // Get all jobs for this company
    console.log('Searching for companyId:', companyId, 'Type:', typeof companyId);
    
    // Check what companyId types exist in jobs collection
    const sampleJobs = await mongoose.connection.db.collection('jobs')
        .find({})
        .limit(3)
        .toArray();
    console.log('Sample job companyId values:', sampleJobs.map(job => ({ 
        companyId: job.companyId, 
        companyIdType: typeof job.companyId,
        jobTitle: job.jobTitle 
    })));
    
    // Try both string and ObjectId
    const companyJobs = await mongoose.connection.db.collection('jobs')
        .find({ 
            $or: [
                { companyId: companyId },
                { companyId: new ObjectId(companyId) }
            ]
        })
        .project({ _id: 1 })
        .toArray();

    console.log('Company jobs found:', companyJobs.length);

    if (companyJobs.length === 0) {
        return new ApiResponse(HTTP_STATUS.OK, {
            applications: [],
            pagination: { currentPage: parseInt(page), totalPages: 0, totalApplications: 0, hasNextPage: false, hasPrevPage: false }
        }, 'No applications found - company has no jobs').send(res);
    }

    // ✅ Keep as ObjectIds — applications.job is stored as ObjectId, not string
    const jobObjectIds = companyJobs.map(job => job._id);
    console.log('Job ObjectIds (first 3):', jobObjectIds.slice(0, 3));

    // Build query using ObjectIds
    const query = { job: { $in: jobObjectIds } };

    if (status) query.status = status;
    if (jobId)  query.job = new ObjectId(jobId); // single filter override

    // console.log('Final query:', JSON.stringify(query));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination:', { page, limit, skip });

    // Verify match before querying
    const matchCheck = await mongoose.connection.db.collection('applications')
        .countDocuments({ job: { $in: jobObjectIds } });
    console.log('Matching applications in DB:', matchCheck);

    const applications = await mongoose.connection.db.collection('applications')
        .find(query)
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

    console.log('Applications fetched:', applications.length);

    // Populate candidate and job details
    const populatedApplications = [];
    for (const app of applications) {
        try {
            const candidate = await mongoose.connection.db.collection('candidates')
                .findOne({ _id: app.candidate });

            const job = await mongoose.connection.db.collection('jobs')
                .findOne({ _id: app.job });

            if (candidate && job) {
                populatedApplications.push({
                    _id: app._id,
                    candidate: {
                        _id: candidate._id,
                        name: candidate.fullname || candidate.name,
                        email: candidate.email,
                        phone: candidate.phone
                    },
                    job: {
                        _id: job._id,
                        jobTitle: job.jobTitle,
                        jobType: job.jobType,
                        companyId: job.companyId
                    },
                    appliedAt: app.appliedAt,
                    status: app.status,
                    resume: app.resume,
                    statusHistory: app.statusHistory
                });
            }
        } catch (err) {
            console.log('Error populating application:', err.message);
        }
    }

    const total = await mongoose.connection.db.collection('applications')
        .countDocuments(query);

    console.log('Populated:', populatedApplications.length, '| Total:', total);
    console.log('--- getCompanyApplications END ---');

    return new ApiResponse(HTTP_STATUS.OK, {
        applications: populatedApplications,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalApplications: total,
            hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1
        }
    }, 'Company applications retrieved successfully').send(res);
});
