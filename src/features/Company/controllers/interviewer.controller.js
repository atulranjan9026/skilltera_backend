const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiError = require('../../../shared/utils/ApiError');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const Interviewer = require('../../../shared/models/interviewer.model');
const Application = require('../../../shared/models/application.model');
const emailService = require('../../../shared/utils/emailService');
const bcrypt = require('bcrypt');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a random alphanumeric password of given length.
 */
const generatePassword = (length = 8) => {
    // Alphanumeric only (spec: 8-char password)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Company / Hiring Manager Routes ─────────────────────────────────────────

/**
 * POST /company/interviewers
 * Create a single interviewer account.
 */
exports.createInterviewer = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        throw ApiError.badRequest('Name and email are required');
    }

    // Determine companyId — caller is either 'company', 'hiring_manager', or 'backup_hiring_manager'
    const companyId = req.user.companyId || req.user._id;
    const hiringManagerId = req.userRole === 'hiring_manager' ? req.user._id : null;
    const backupHiringManagerId = req.userRole === 'backup_hiring_manager' ? req.user._id : null;


    const existing = await Interviewer.findOne({ email: email.toLowerCase() });
    if (existing) {
        throw ApiError.conflict('An interviewer with this email already exists');
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const interviewer = await Interviewer.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        companyId,
        hiringManagerId,
        backupHiringManagerId,
        registrationDate: new Date().toISOString(),
    });

    // Resolve company name for email
    const companyName =
        req.user.name ||
        (req.user.companyId?.companyName) ||
        'Your Company';

    // Send credentials via email (non-blocking)
    emailService
        .sendInterviewerWelcomeEmail(email, name, plainPassword, companyName)
        .catch((err) => console.error('Failed to send interviewer welcome email:', err));

    return res.status(201).json(
        new ApiResponse(201, { interviewer: { _id: interviewer._id, name, email, active: interviewer.active } }, 'Interviewer created successfully')
    );
});

/**
 * POST /company/interviewers/bulk
 * Bulk create interviewer accounts.
 */
exports.bulkCreateInterviewers = asyncHandler(async (req, res) => {
    const interviewers = req.body.interviewers || req.body.items;

    if (!Array.isArray(interviewers) || interviewers.length === 0) {
        throw ApiError.badRequest('Provide an array of interviewers');
    }

    const companyId = req.user.companyId || req.user._id;
    const hiringManagerId = req.userRole === 'hiring_manager' ? req.user._id : null;
    const backupHiringManagerId = req.userRole === 'backup_hiring_manager' ? req.user._id : null;
    const companyName = req.user.companyName || req.user.companyId?.companyName || 'Your Company';


    const results = [];

    for (const { name, email } of interviewers) {
        try {
            if (!name || !email) continue;
            const existing = await Interviewer.findOne({ email: email.toLowerCase() });
            if (existing) {
                results.push({ email, status: 'skipped', reason: 'Already exists' });
                continue;
            }

            const plainPassword = generatePassword();
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            const interviewer = await Interviewer.create({
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                companyId,
                hiringManagerId,
                backupHiringManagerId,
                registrationDate: new Date().toISOString(),
            });

            emailService
                .sendInterviewerWelcomeEmail(email, name, plainPassword, companyName)
                .catch((err) => console.error(`Failed to send email to ${email}:`, err));

            results.push({ email, status: 'created', _id: interviewer._id });
        } catch (err) {
            results.push({ email, status: 'error', reason: err.message });
        }
    }

    return res.status(201).json(
        new ApiResponse(201, { results }, 'Bulk creation complete')
    );
});

/**
 * GET /company/interviewers
 * List all interviewers for this company.
 */
exports.getInterviewers = asyncHandler(async (req, res) => {
    const companyId = req.user.companyId || req.user._id;

    const interviewers = await Interviewer.find({ companyId }).select('-password').lean();

    return res.status(200).json(
        new ApiResponse(200, { interviewers }, 'Interviewers fetched successfully')
    );
});

/**
 * PUT /company/interviewers/:id
 * Update interviewer details (name, active status).
 */
exports.updateInterviewer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, active } = req.body;

    const companyId = req.user.companyId || req.user._id;

    const interviewer = await Interviewer.findOneAndUpdate(
        { _id: id, companyId },
        { ...(name && { name }), ...(active !== undefined && { active }) },
        { new: true, runValidators: true }
    ).select('-password');

    if (!interviewer) {
        throw ApiError.notFound('Interviewer not found');
    }

    return res.status(200).json(
        new ApiResponse(200, { interviewer }, 'Interviewer updated successfully')
    );
});

/**
 * DELETE /company/interviewers/:id
 * Delete an interviewer.
 */
exports.deleteInterviewer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId || req.user._id;

    const interviewer = await Interviewer.findOneAndDelete({ _id: id, companyId });

    if (!interviewer) {
        throw ApiError.notFound('Interviewer not found');
    }

    return res.status(200).json(
        new ApiResponse(200, {}, 'Interviewer deleted successfully')
    );
});

/**
 * POST /company/interviewers/assign
 * Assign one or more interviewers to an application.
 * Body: { applicationId, interviewerIds: [id, ...] }
 */
exports.assignInterviewers = asyncHandler(async (req, res) => {
    const { applicationId, interviewerIds } = req.body;

    if (!applicationId || !Array.isArray(interviewerIds) || interviewerIds.length === 0) {
        throw ApiError.badRequest('applicationId and interviewerIds[] are required');
    }

    const application = await Application.findById(applicationId);
    if (!application) {
        throw ApiError.notFound('Application not found');
    }

    // Merge without duplicates
    const existingIds = application.assignedInterviewers.map((id) => id.toString());
    const newIds = interviewerIds.filter((id) => !existingIds.includes(id.toString()));
    application.assignedInterviewers.push(...newIds);

    // Advance status to 'interviewed' if it's earlier in the pipeline
    if (['applied', 'shortlisted'].includes(application.status)) {
        application.status = 'interviewed';
    }

    await application.save();

    const updated = await Application.findById(applicationId)
        .populate('assignedInterviewers', 'name email')
        .lean();

    return res.status(200).json(
        new ApiResponse(200, { application: updated }, 'Interviewers assigned successfully')
    );
});

// ─── Interviewer-Only Routes ──────────────────────────────────────────────────

/**
 * GET /company/interviewer/assigned-candidates
 * Returns all applications where this interviewer is assigned.
 */
exports.getAssignedCandidates = asyncHandler(async (req, res) => {
    const interviewerId = req.user._id;

    const applications = await Application.find({
        assignedInterviewers: interviewerId,
    })
        .populate('candidate', 'name email phone avatar')
        .populate('job', 'title description location jobType experienceLevel')
        .lean();

    // Normalize response to match the frontend's expected shape.
    const mappedApplications = applications.map((app) => {
        const candidate = app.candidate
            ? {
                _id: app.candidate._id,
                name: app.candidate.name,
                email: app.candidate.email,
                phone: app.candidate.phone,
                avatar: app.candidate.avatar,
            }
            : app.candidate;

        const job = app.job
            ? {
                _id: app.job._id,
                jobTitle: app.job.title,
                description: app.job.description,
                location: app.job.location,
                jobType: app.job.jobType,
                experienceLevel: app.job.experienceLevel,
            }
            : app.job;

        return {
            ...app,
            candidate,
            job,
        };
    });

    return res.status(200).json(
        new ApiResponse(200, { applications: mappedApplications }, 'Assigned candidates fetched successfully')
    );
});

/**
 * POST /company/interviewer/feedback
 * Submit or update feedback for an application.
 * Body: { applicationId, feedback, rating, decision }
 */
exports.submitFeedback = asyncHandler(async (req, res) => {
    const interviewerId = req.user._id;
    const { applicationId, feedback, rating, decision } = req.body;

    if (!applicationId) {
        throw ApiError.badRequest('applicationId is required');
    }

    const application = await Application.findById(applicationId);
    if (!application) {
        throw ApiError.notFound('Application not found');
    }

    // Check that this interviewer is actually assigned
    const isAssigned = application.assignedInterviewers.some(
        (id) => id.toString() === interviewerId.toString()
    );
    if (!isAssigned) {
        throw ApiError.forbidden('You are not assigned to this application');
    }

    // Update existing feedback or push new
    const existingIndex = application.interviewFeedback.findIndex(
        (f) => f.interviewerId.toString() === interviewerId.toString()
    );

    if (existingIndex >= 0) {
        application.interviewFeedback[existingIndex] = {
            interviewerId,
            feedback,
            rating,
            decision,
            submittedAt: new Date(),
        };
    } else {
        application.interviewFeedback.push({
            interviewerId,
            feedback,
            rating,
            decision,
            submittedAt: new Date(),
        });
    }

    await application.save();

    return res.status(200).json(
        new ApiResponse(200, { interviewFeedback: application.interviewFeedback }, 'Feedback submitted successfully')
    );
});

/**
 * GET /company/interviewer/feedback/:applicationId
 * Get all feedback for a specific application (accessible by interviewer & hiring manager).
 */
exports.getFeedbackForApplication = asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
        .populate('interviewFeedback.interviewerId', 'name email')
        .populate('candidate', 'name email phone')
        .populate('job', 'title jobType')
        .lean();

    if (!application) {
        throw ApiError.notFound('Application not found');
    }

    return res.status(200).json(
        new ApiResponse(200, { feedback: application.interviewFeedback, candidate: application.candidate, job: application.job }, 'Feedback fetched successfully')
    );
});
