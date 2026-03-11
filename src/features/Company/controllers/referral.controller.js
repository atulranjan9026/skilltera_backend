const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const ApiError = require('../../../shared/utils/ApiError');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

const Referral = require('../models/referral.model');
const Application = require('../../../shared/models/application.model');
const Job = require('../../../shared/models/job.model');
const Candidate = require('../../candidates/models/candidate.model');
const { ObjectId } = require('mongodb');

const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function validateEmail(email) {
  return String(email).match(EMAIL_REGEX);
}

function getCompanyIdFromUser(user) {
  if (!user) return null;
  const cid = user.companyId;
  if (cid) return (cid._id || cid).toString();
  if (user.constructor?.modelName === 'Company' || user.constructor?.modelName === 'Companies') {
    return user._id?.toString() || null;
  }
  return null;
}

function canReferToJob(user, jobId) {
  const roles = user?.roles || [];
  const role = user?.role;
  const isAdmin = roles.includes('company_admin') || role === 'company';
  const isHiringManager = roles.includes('hiring_manager');
  if (isAdmin || isHiringManager) return true;
  const assignedIds = user?.assignedJobIds || [];
  return assignedIds.some((id) => (id._id || id).toString() === jobId.toString());
}

/**
 * Create a referral
 * @route   POST /api/v1/company/referrals
 * @access  Private (recruiter, company_admin, hiring_manager)
 */
exports.createReferral = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ApiError.badRequest(errors.array().map((e) => e.msg).join('; '));
  }

  const user = req.user;
  const companyId = getCompanyIdFromUser(user);
  if (!companyId) {
    throw ApiError.forbidden('Company context required');
  }

  const {
    jobId,
    candidateName,
    candidateEmail,
    candidateLinkedInUrl,
    connectionType,
    description,
  } = req.body;

  if (!jobId || !candidateName || !candidateEmail) {
    throw ApiError.badRequest('jobId, candidateName, and candidateEmail are required');
  }

  const normalizedEmail = String(candidateEmail).toLowerCase().trim();
  if (!validateEmail(normalizedEmail)) {
    throw ApiError.badRequest('Invalid email format');
  }

  const job = await Job.findById(jobId).select('_id title companyId companyName').lean();
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  const jobCompanyId = (job.companyId?._id || job.companyId).toString();
  if (jobCompanyId !== companyId) {
    throw ApiError.forbidden('Job does not belong to your company');
  }

  if (!canReferToJob(user, jobId)) {
    throw ApiError.forbidden('You are not assigned to this job');
  }

  const existingReferral = await Referral.findOne({
    recruiterId: user._id,
    jobId,
    candidateEmail: normalizedEmail,
  });
  if (existingReferral) {
    throw ApiError.conflict('You have already referred this candidate to this job');
  }

  let candidate = await Candidate.findOne({ email: normalizedEmail }).select('_id name email').lean();
  let isNewCandidate = false;
  let candidateId = null;

  if (!candidate) {
    isNewCandidate = true;
    const tempPassword = Math.random().toString(36).slice(2, 12);
    const hashedPassword = await bcrypt.hash(tempPassword, await bcrypt.genSalt());
    const newCandidate = await Candidate.create({
      name: candidateName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      overallExperience: 0,
    });
    candidateId = newCandidate._id;
    candidate = { _id: newCandidate._id, name: newCandidate.name, email: newCandidate.email };

    try {
      const { notifyNewCandidateRecruiterReferral } = require('../../../shared/utilities/companyEmails');
      await notifyNewCandidateRecruiterReferral(
        normalizedEmail,
        candidateName,
        tempPassword,
        user.name || 'Recruiter',
        job.title || job.jobTitle || 'Job',
        connectionType || ''
      );
    } catch (err) {
      console.error('Error sending new candidate referral email:', err);
    }
  } else {
    candidateId = candidate._id;
    try {
      const { notifyExistingCandidateRecruiterReferral } = require('../../../shared/utilities/companyEmails');
      await notifyExistingCandidateRecruiterReferral(
        normalizedEmail,
        candidateName,
        user.name || 'Recruiter',
        job.title || job.jobTitle || 'Job',
        companyId
      );
    } catch (err) {
      console.error('Error sending existing candidate referral email:', err);
    }
  }

  const existingApplication = await Application.findOne({
    candidate: candidateId,
    job: jobId,
  });

  let applicationId = null;
  if (!existingApplication) {
    const application = await Application.create({
      candidate: candidateId,
      job: jobId,
      status: 'applied',
      referralSource: 'recruiter',
      referredBy: user._id,
      appliedAt: new Date(),
    });
    applicationId = application._id;
  } else {
    applicationId = existingApplication._id;
    await Application.findByIdAndUpdate(applicationId, {
      referralSource: 'recruiter',
      referredBy: user._id,
    });
  }

  const referral = await Referral.create({
    recruiterId: user._id,
    companyId: new ObjectId(companyId),
    jobId: new ObjectId(jobId),
    candidateName: candidateName.trim(),
    candidateEmail: normalizedEmail,
    candidateLinkedInUrl: (candidateLinkedInUrl || '').trim() || undefined,
    connectionType: (connectionType || '').trim() || undefined,
    description: (description || '').trim() || undefined,
    candidateId,
    applicationId,
    isNewCandidate,
    status: isNewCandidate ? 'pending' : 'notified',
  });

  const message = isNewCandidate
    ? 'Candidate created and referral sent. Candidate will receive signup email.'
    : 'Candidate referred successfully. Candidate has been notified.';

  return new ApiResponse(HTTP_STATUS.CREATED, { referral, message }, message).send(res);
});

/**
 * Get recruiter's referrals
 * @route   GET /api/v1/company/referrals
 * @access  Private (recruiter, company_admin, hiring_manager)
 */
exports.getRecruiterReferrals = asyncHandler(async (req, res) => {
  const user = req.user;
  const { jobId } = req.query;

  const filter = { recruiterId: user._id };
  if (jobId) filter.jobId = jobId;

  const referrals = await Referral.find(filter)
    .populate({ path: 'companyId', select: 'companyName' })
    .populate({ path: 'jobId', select: 'title companyId' })
    .sort({ createdAt: -1 })
    .lean();

  return new ApiResponse(HTTP_STATUS.OK, { referrals }, 'Referrals retrieved successfully').send(res);
});

/**
 * Get recruiter referral stats
 * @route   GET /api/v1/company/referrals/stats
 * @access  Private (recruiter, company_admin, hiring_manager)
 */
exports.getRecruiterReferralStats = asyncHandler(async (req, res) => {
  const user = req.user;

  const allReferrals = await Referral.find({ recruiterId: user._id }).select('status').lean();
  const statistics = {
    total: allReferrals.length,
    pending: 0,
    notified: 0,
    applied: 0,
    shortlisted: 0,
    rejected: 0,
  };
  allReferrals.forEach((r) => {
    if (statistics[r.status] !== undefined) statistics[r.status]++;
  });

  return new ApiResponse(HTTP_STATUS.OK, { statistics }, 'Stats retrieved successfully').send(res);
});

/**
 * Search candidates by name or email (for "existing candidate" mode in referral form)
 * @route   GET /api/v1/company/candidates/search
 * @access  Private (recruiter, company_admin, hiring_manager)
 */
exports.searchCandidates = asyncHandler(async (req, res) => {
  const { search, limit = 20 } = req.query;
  const q = (search || '').trim();
  if (q.length < 2) {
    return new ApiResponse(HTTP_STATUS.OK, { candidates: [] }, 'Search requires at least 2 characters').send(res);
  }

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const candidates = await Candidate.find({
    $or: [
      { name: regex },
      { email: regex },
    ],
  })
    .select('_id name email')
    .limit(Math.min(parseInt(limit, 10) || 20, 50))
    .lean();

  return new ApiResponse(HTTP_STATUS.OK, { candidates }, 'Candidates retrieved successfully').send(res);
});
