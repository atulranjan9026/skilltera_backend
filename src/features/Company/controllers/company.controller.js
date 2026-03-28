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
const BackupHiringManager = require('../../../shared/models/backupHiringManager.model');
const Interviewer = require('../../../shared/models/interviewer.model');
const Job = require('../../../shared/models/job.model');
const Candidate = require('../../candidates/models/candidate.model');
const Test = require('../../candidates/models/test.model');
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
 * Supports: Company Admin, Hiring Manager, Backup Hiring Manager, and Interviewer roles.
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

    // 4. Try Backup Hiring Manager login
    if (!user) {
        try {
            const backupHiringManager = await BackupHiringManager.login(email, password);
            if (backupHiringManager && backupHiringManager.companyId.toString() === companyId.toString()) {
                user = backupHiringManager;
                role = 'backup_hiring_manager';
                userData = await BackupHiringManager.findById(backupHiringManager._id)
                    .select('-password')
                    .populate({ path: 'companyId', select: 'companyName email' })
                    .populate({ path: 'hiringManagerId', select: 'name email' });
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

    // Enforce scoping: non-company users can only access their own companyId
    const requestedCompanyId = companyId.toString();
    const authedCompanyId =
        req.userRole === 'company'
            ? req.userId.toString()
            : (req.user?.companyId?._id || req.user?.companyId)?.toString();

    if (authedCompanyId && authedCompanyId !== requestedCompanyId) {
        throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
    }

    const userIdObj =
        typeof req.userId === 'string' ? new ObjectId(req.userId) : req.userId;

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

    // Hiring Managers / Backup Hiring Managers can only see jobs assigned to them.
    // Jobs may be stored in either legacy shape (top-level hiringManagerId fields)
    // or new shape (enterpriseAssignment.*).
    let roleScope = null;
    if (req.userRole === 'hiring_manager') {
        roleScope = {
            $or: [
                { 'enterpriseAssignment.hiringManagerId': userIdObj },
                { hiringManagerId: userIdObj },
            ],
        };
    } else if (req.userRole === 'backup_hiring_manager') {
        roleScope = {
            $or: [
                { 'enterpriseAssignment.backupHiringManagerId': userIdObj },
                { backupHiringManagerId: userIdObj },
            ],
        };
    }

    // FIX: Use $and to combine the $or companyId match with additional filters
    const andParts = [baseQuery];
    if (Object.keys(filters).length > 0) andParts.push(filters);
    if (roleScope) andParts.push(roleScope);
    const finalQuery = andParts.length > 1 ? { $and: andParts } : baseQuery;

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

    // Enforce scoping: non-company users can only access their own companyId
    const requestedCompanyId = companyId.toString();
    const authedCompanyId =
        req.userRole === 'company'
            ? req.userId.toString()
            : (req.user?.companyId?._id || req.user?.companyId)?.toString();

    if (authedCompanyId && authedCompanyId !== requestedCompanyId) {
        throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
    }

    const userIdObj =
        typeof req.userId === 'string' ? new ObjectId(req.userId) : req.userId;

    // Hiring Managers / Backup Hiring Managers can only see applications for jobs assigned to them.
    // Jobs may be stored in either legacy shape (top-level hiringManagerId fields)
    // or new shape (enterpriseAssignment.*).
    let roleJobScope = null;
    if (req.userRole === 'hiring_manager') {
        roleJobScope = {
            $or: [
                { 'enterpriseAssignment.hiringManagerId': userIdObj },
                { hiringManagerId: userIdObj },
            ],
        };
    } else if (req.userRole === 'backup_hiring_manager') {
        roleJobScope = {
            $or: [
                { 'enterpriseAssignment.backupHiringManagerId': userIdObj },
                { backupHiringManagerId: userIdObj },
            ],
        };
    }

    const jobFindQuery = {
        $or: [
            { companyId: companyId },
            { companyId: new ObjectId(companyId) }
        ]
    };
    const finalJobFindQuery = roleJobScope ? { $and: [jobFindQuery, roleJobScope] } : jobFindQuery;

    const companyJobs = await mongoose.connection.db.collection('jobs')
        .find(finalJobFindQuery)
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

    // Enforce scoping: non-company users can only access their own companyId
    const requestedCompanyId = companyId.toString();
    const authedCompanyId =
        req.userRole === 'company'
            ? req.userId.toString()
            : (req.user?.companyId?._id || req.user?.companyId)?.toString();

    if (authedCompanyId && authedCompanyId !== requestedCompanyId) {
        throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
    }

    const userIdObj =
        typeof req.userId === 'string' ? new ObjectId(req.userId) : req.userId;

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

    // Hiring Managers / Backup Hiring Managers can only update applications for jobs assigned to them
    if (req.userRole === 'hiring_manager') {
        const assigned =
            (job.enterpriseAssignment?.hiringManagerId && job.enterpriseAssignment.hiringManagerId.toString() === userIdObj.toString()) ||
            (job.hiringManagerId && job.hiringManagerId.toString() === userIdObj.toString());
        if (!assigned) throw ApiError.forbidden('You do not have permission to update this application');
    } else if (req.userRole === 'backup_hiring_manager') {
        const assigned =
            (job.enterpriseAssignment?.backupHiringManagerId && job.enterpriseAssignment.backupHiringManagerId.toString() === userIdObj.toString()) ||
            (job.backupHiringManagerId && job.backupHiringManagerId.toString() === userIdObj.toString());
        if (!assigned) throw ApiError.forbidden('You do not have permission to update this application');
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

/**
 * Get Candidate Test Results (Company view)
 * @route   GET /api/v1/company/:companyId/test-results/:candidateId
 * @access  Private (Company Admin/Hiring Manager)
 */
exports.getCandidateTestResults = asyncHandler(async (req, res) => {
    const { companyId, candidateId } = req.params;

    if (!candidateId || !ObjectId.isValid(candidateId)) {
        throw ApiError.badRequest('Invalid candidate ID');
    }

    const candidate = await Candidate.findById(candidateId)
        .select('fullname email phone skills')
        .lean();

    if (!candidate) {
        throw ApiError.notFound('Candidate not found');
    }

    const test = await Test.findOne({ candidateId, testLimit: true, practiceMode: { $ne: true } })
        .select('overallScore finalScore rating typeOfTest skillNeedToTest techAnalysis summary evaluations nonTechnicalProblems testTakenDate createdAt updatedAt violation')
        .sort({ updatedAt: -1 })
        .lean();

    if (!test) {
        return new ApiResponse(HTTP_STATUS.OK, {
            hasTestData: false,
            testData: null,
        }, 'No test data found for this candidate').send(res);
    }

    const formattedData = {
        hasTestData: true,
        _id: test._id,
        testType: test.typeOfTest || 'N/A',
        overallScore: test.overallScore ?? test.finalScore ?? 0,
        rating: test.rating || 'NOT_RATED',
        skillsTested: test.skillNeedToTest || [],
        evaluations: (test.evaluations || []).map(evaluation => ({
            problem: evaluation.problem || 'No problem data',
            solution: evaluation.solution || 'No solution data',
            evaluation: evaluation.evaluation || 'No evaluation data',
        })),
        nonTechnicalProblems: test.nonTechnicalProblems || [],
        technicalAnalysis: test.techAnalysis ? {
            totalPenalty: test.techAnalysis.total_penalty || 0,
            mismatches: (test.techAnalysis.mismatch_details || []).map(m => ({
                problem: m.problem || 'N/A',
                expected: m.expected || 'N/A',
                submitted: m.submitted || 'N/A',
                severity: m.severity || 'N/A',
            })),
        } : null,
        summary: test.summary ? {
            passedCount: test.summary.passedCount || 0,
            totalPenalty: test.summary.totalPenalty || 0,
            criticalMismatches: test.summary.criticalMismatches || 0,
            recommendations: test.summary.recommendations || [],
        } : null,
        violationCount: (test.violation || []).length,
        testDate: test.testTakenDate || test.createdAt,
    };

    return new ApiResponse(HTTP_STATUS.OK, {
        hasTestData: true,
        testData: formattedData,
    }, 'Test results retrieved successfully').send(res);
});
