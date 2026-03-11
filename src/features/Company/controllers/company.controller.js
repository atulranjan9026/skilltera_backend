const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const ApiError = require('../../../shared/utils/ApiError');
const TokenManager = require('../../../shared/utils/tokenManager');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../shared/constants');

const Company = require('../../../shared/models/company.model');
const CompanyUser = require('../models/companyUser.model');
const HiringManager = require('../../../shared/models/hiringManager.model');
const Interviewer = require('../../../shared/models/interviewer.model');
const Job = require('../../../shared/models/job.model');
const Candidate = require('../../candidates/models/candidate.model');
const { ObjectId } = require('mongodb');

/**
 * Resolve the company ID the authenticated user is authorized to access.
 * Returns null for candidates or users without company context.
 */
function getAuthorizedCompanyId(req) {
    const user = req.user;
    if (!user) return null;
    const cid = user.companyId;
    if (cid) return (cid._id || cid).toString();
    if (user.constructor?.modelName === 'Company' || user.constructor?.modelName === 'Companies') {
        return user._id?.toString() || null;
    }
    return null;
}

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
 * Supports: CompanyUser (unified schema) first, then fallback to legacy
 * Company Admin, Hiring Manager, and Interviewer models.
 * @route   POST /api/v1/company/auth/login
 * @access  Public
 */
exports.companyLogin = asyncHandler(async (req, res) => {
    let { companyName, email, password } = req.body;

    if (!companyName || !email || !password) {
        throw ApiError.badRequest(ERROR_MESSAGES.MISSING_FIELDS);
    }

    email = email.toLowerCase().trim();

    // Try exact match first, then case-insensitive (company names may vary in casing)
    let company = await Company.findOne({ companyName });
    if (!company) {
        company = await Company.findOne({
            companyName: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        });
    }
    if (!company) {
        throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }
    const companyId = company._id;

    let user = null;
    let role = null;
    let userData = null;
    let useCompanyUser = false;

    // 1. Try CompanyUser (unified schema) first
    const companyUser = await CompanyUser.findOne({
        email,
        companyId,
        isActive: true,
    });
    if (companyUser) {
        const auth = await bcrypt.compare(password, companyUser.password);
        if (auth) {
            user = companyUser;
            useCompanyUser = true;
            userData = await CompanyUser.findById(companyUser._id)
                .select('-password')
                .populate({ path: 'companyId', select: 'companyName email' })
                .lean();
            if (userData && userData.companyId) {
                userData.companyName = userData.companyId.companyName;
                userData.companyId = userData.companyId._id;
            }
            await CompanyUser.updateOne(
                { _id: companyUser._id },
                { $set: { lastLoginAt: new Date() } }
            );
        }
    }

    // 2. Fallback: Try Company Admin login (legacy)
    if (!user) {
        try {
            const companyAdmin = await Company.login(companyName, email, password);
            if (companyAdmin && companyAdmin._id.toString() === companyId.toString()) {
                user = companyAdmin;
                role = 'company';
                userData = await Company.findById(companyAdmin._id).select('-password').lean();
                userData.companyName = company.companyName;
            }
        } catch (_) { /* Fall through */ }
    }

    // 3. Fallback: Try Hiring Manager login (legacy)
    if (!user) {
        try {
            const hiringManager = await HiringManager.login(email, password);
            if (hiringManager && hiringManager.companyId.toString() === companyId.toString()) {
                user = hiringManager;
                role = 'hiring_manager';
                userData = await HiringManager.findById(hiringManager._id)
                    .select('-password')
                    .populate({ path: 'companyId', select: 'companyName email' })
                    .lean();
                if (userData && userData.companyId) {
                    userData.companyName = userData.companyId.companyName;
                    userData.companyId = userData.companyId._id;
                }
            }
        } catch (_) { /* Fall through */ }
    }

    // 4. Fallback: Try Interviewer login (legacy)
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
                    .populate({ path: 'companyId', select: 'companyName email' })
                    .lean();
                if (userData && userData.companyId) {
                    userData.companyName = userData.companyId.companyName;
                    userData.companyId = userData.companyId._id;
                }
            }
        } catch (_) { /* All models exhausted */ }
    }

    if (!user || !userData) {
        throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    let tokenPayload;
    let responseUser;

    if (useCompanyUser) {
        const primaryRole = user.roles?.includes('company_admin')
            ? 'company'
            : user.roles?.[0] || 'company';
        tokenPayload = {
            userId: user._id,
            email: userData.email,
            companyId: user.companyId.toString(),
            role: primaryRole,
            roles: user.roles || [],
            isCompanyUser: true,
        };
        responseUser = {
            ...userData,
            _id: user._id,
            role: primaryRole,
            roles: user.roles,
        };
    } else {
        tokenPayload = { userId: user._id, email: userData.email, role };
        responseUser = { ...userData, role };
    }

    const accessToken = TokenManager.generateAccessToken(tokenPayload);
    const refreshToken = TokenManager.generateRefreshToken({ userId: user._id });

    return new ApiResponse(
        HTTP_STATUS.OK,
        { accessToken, refreshToken, user: responseUser },
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

    const authorizedCompanyId = getAuthorizedCompanyId(req);
    if (!authorizedCompanyId || companyId !== authorizedCompanyId) {
        throw ApiError.forbidden('Access denied to this company');
    }

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

    const authorizedCompanyId = getAuthorizedCompanyId(req);
    if (!authorizedCompanyId || companyId !== authorizedCompanyId) {
        throw ApiError.forbidden('Access denied to this company');
    }

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
    const { status } = req.body;

    const authorizedCompanyId = getAuthorizedCompanyId(req);
    if (!authorizedCompanyId || companyId !== authorizedCompanyId) {
        throw ApiError.forbidden('Access denied to this company');
    }

    const validStatuses = ['applied', 'shortlisted', 'interviewed', 'selected', 'rejected', 'withdrawn'];
    if (!status || !validStatuses.includes(status)) {
        throw ApiError.badRequest('Invalid status. Must be one of: ' + validStatuses.join(', '));
    }

    const companyJobs = await mongoose.connection.db.collection('jobs')
        .find({
            $or: [
                { companyId },
                { companyId: new ObjectId(companyId) },
            ],
        })
        .project({ _id: 1 })
        .toArray();

    const jobIds = companyJobs.map((j) => j._id);
    if (jobIds.length === 0) {
        throw ApiError.notFound('Application not found');
    }

    const result = await mongoose.connection.db.collection('applications').findOneAndUpdate(
        {
            _id: new ObjectId(applicationId),
            job: { $in: jobIds },
        },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: 'after' }
    );

    if (!result) {
        throw ApiError.notFound('Application not found');
    }

    return new ApiResponse(
        HTTP_STATUS.OK,
        { application: result },
        'Application status updated successfully'
    ).send(res);
});

/**
 * Get jobs a recruiter can refer candidates to (assigned jobs or all company jobs for admins)
 * @route   GET /api/v1/company/jobs/assigned
 * @access  Private (recruiter, company_admin, hiring_manager)
 */
exports.getRecruiterAssignedJobs = asyncHandler(async (req, res) => {
    const user = req.user;
    const companyId = getAuthorizedCompanyId(req);
    if (!companyId) {
        throw ApiError.forbidden('Company context required');
    }

    const roles = user?.roles || [];
    const role = user?.role;
    const isAdmin = roles.includes('company_admin') || role === 'company';
    const isHiringManager = roles.includes('hiring_manager');
    const assignedJobIds = user?.assignedJobIds || [];

    let jobFilter = {
        $or: [{ companyId: companyId }, { companyId: new ObjectId(companyId) }],
        isActive: true,
    };
    if (!isAdmin && !isHiringManager) {
        if (assignedJobIds.length === 0) {
            return new ApiResponse(HTTP_STATUS.OK, { jobs: [] }, 'No jobs assigned').send(res);
        }
        const ids = assignedJobIds.map((id) => (id._id || id));
        jobFilter._id = { $in: ids };
    }

    const jobs = await Job.find(jobFilter)
        .select('_id title companyId companyName jobType location applicationDeadline')
        .sort({ postedDate: -1 })
        .lean();

    return new ApiResponse(
        HTTP_STATUS.OK,
        { jobs },
        'Assigned jobs retrieved successfully'
    ).send(res);
});
