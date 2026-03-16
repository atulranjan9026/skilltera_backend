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
    const { status, active } = req.query;

    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const company = await Company.findById(companyId);
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    // FIX: getCompanyApplications already handles both string and ObjectId with $or,
    // but getCompanyJobs was querying with { companyId } (plain string) only.
    // Jobs may be stored with companyId as ObjectId — match both to be safe.
    const query = {
        $or: [
            { companyId: companyId },
            { companyId: new ObjectId(companyId) },
        ]
    };
    if (status) query.$or.forEach(q => { q.status = status; }); // won't work cleanly
    // Better approach: use $and to combine companyId match with optional filters:
    const baseQuery = {
        $or: [
            { companyId: companyId },
            { companyId: new ObjectId(companyId) },
        ]
    };
    const filters = {};
    if (status)               filters.status = status;
    if (active !== undefined) filters.active = active === 'true';

    // FIX: Use $and to combine the $or companyId match with additional filters
    const finalQuery = Object.keys(filters).length > 0
        ? { $and: [baseQuery, filters] }
        : baseQuery;

    const skip = (page - 1) * limit;

    // FIX: Run count and find in parallel (same as getCompanyApplications)
    const [jobList, total] = await Promise.all([
        mongoose.connection.db.collection('jobs')
            .find(finalQuery)
            .sort({ postedOn: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        mongoose.connection.db.collection('jobs')
            .countDocuments(finalQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return new ApiResponse(
        HTTP_STATUS.OK,
        {
            jobs: jobList,
            pagination: {
                currentPage: page,
                totalPages,
                totalJobs: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
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
    const { status, jobId } = req.query;

    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const company = await Company.findById(companyId);
    if (!company) throw ApiError.notFound('Company not found');

    const companyJobs = await mongoose.connection.db.collection('jobs')
        .find({
            $or: [
                { companyId: companyId },
                { companyId: new ObjectId(companyId) }
            ]
        })
        .project({ _id: 1 })
        .toArray();

    if (companyJobs.length === 0) {
        return new ApiResponse(HTTP_STATUS.OK, {
            applications: [],
            pagination: {
                currentPage: page,
                totalPages: 0,
                totalApplications: 0,
                hasNextPage: false,
                hasPrevPage: false,
            }
        }, 'No applications found - company has no jobs').send(res);
    }

    const jobObjectIds = companyJobs.map(job => job._id);

    const query = { job: { $in: jobObjectIds } };
    if (status) query.status = status;
    if (jobId)  query.job = new ObjectId(jobId);

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
        mongoose.connection.db.collection('applications')
            .find(query)
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        mongoose.connection.db.collection('applications')
            .countDocuments(query),
    ]);

    const populatedApplications = [];
    for (const app of applications) {
        try {
            const [candidate, job] = await Promise.all([
                mongoose.connection.db.collection('candidates').findOne({ _id: app.candidate }),
                mongoose.connection.db.collection('jobs').findOne({ _id: app.job }),
            ]);

            if (candidate && job) {
                populatedApplications.push({
                    _id: app._id,
                    candidate: {
                        _id: candidate._id,
                        name: candidate.fullname || candidate.name,
                        email: candidate.email,
                        phone: candidate.phone,
                    },
                    job: {
                        _id: job._id,
                        jobTitle: job.jobTitle,
                        jobType: job.jobType,
                        companyId: job.companyId,
                    },
                    appliedAt: app.appliedAt,
                    status: app.status,
                    resume: app.resume,
                    statusHistory: app.statusHistory,
                });
            }
        } catch (err) {
            console.error('Error populating application:', err.message);
        }
    }

    const totalPages = Math.ceil(total / limit);

    return new ApiResponse(HTTP_STATUS.OK, {
        applications: populatedApplications,
        pagination: {
            currentPage: page,
            totalPages,
            totalApplications: total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        }
    }, 'Company applications retrieved successfully').send(res);
});

/**
 * Update Application Status
 * @route   PUT /api/v1/company/:companyId/applications/:applicationId
 * @access  Private (Company Admin/Hiring Manager)
 */
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
    const { companyId, applicationId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
        throw ApiError.badRequest('Status is required');
    }

    const company = await Company.findById(companyId);
    if (!company) throw ApiError.notFound('Company not found');

    // 1. Find the application
    const application = await mongoose.connection.db.collection('applications').findOne({
        _id: new ObjectId(applicationId)
    });

    if (!application) {
        throw ApiError.notFound('Application not found');
    }

    // 2. Verify the job belongs to the company
    const job = await mongoose.connection.db.collection('jobs').findOne({
        _id: application.job,
        $or: [
            { companyId: companyId },
            { companyId: new ObjectId(companyId) }
        ]
    });

    if (!job) {
        throw ApiError.forbidden('You do not have permission to update this application');
    }

    // 3. Update the status using the model for pre-save hooks
    const Application = require('../../../shared/models/application.model');
    
    const appDoc = await Application.findById(applicationId);
    if (!appDoc) throw ApiError.notFound('Application document not found');

    appDoc.status = status;
    
    // Add to history
    appDoc.statusHistory.push({
        status,
        changedAt: new Date(),
        changedBy: req.userId,
        changedByModel: req.userRole === 'hiring_manager' ? 'Company' : 'Company', // Both map to Company side in model enum
        notes: notes || `Status changed to ${status}`
    });

    await appDoc.save();

    return new ApiResponse(
        HTTP_STATUS.OK,
        appDoc,
        `Application status updated to ${status}`
    ).send(res);
});
