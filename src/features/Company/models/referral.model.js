const mongoose = require('mongoose');

/**
 * Referral Schema
 * Tracks recruiter referrals of candidates to jobs
 */
const referralSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyUser',
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    candidateEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    candidateLinkedInUrl: {
      type: String,
      trim: true,
    },
    connectionType: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    isNewCandidate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'notified', 'applied', 'shortlisted', 'rejected'],
      default: 'pending',
    },
    resume: {
      url: String,
      publicId: String,
      filename: String,
    },
  },
  { timestamps: true }
);

referralSchema.index({ recruiterId: 1 });
referralSchema.index({ companyId: 1 });
referralSchema.index({ jobId: 1 });
referralSchema.index({ candidateEmail: 1 });
referralSchema.index({ candidateId: 1 });
referralSchema.index({ recruiterId: 1, jobId: 1 });
referralSchema.index({ companyId: 1, jobId: 1 });
referralSchema.index(
  { recruiterId: 1, jobId: 1, candidateEmail: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Referral', referralSchema);
