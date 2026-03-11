const mongoose = require('mongoose');

const ROLES = ['company_admin', 'hiring_manager', 'interviewer', 'recruiter'];

const companyUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      required: true,
    },
    roles: [
      {
        type: String,
        enum: ROLES,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyUser',
    },
    assignedJobIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
      },
    ],
    primaryCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
    },
    keySkills: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
  },
  {
    timestamps: true,
  }
);

companyUserSchema.index({ companyId: 1, isActive: 1 });
companyUserSchema.index({ companyId: 1, roles: 1 });
companyUserSchema.index({ email: 1, companyId: 1 });

module.exports = mongoose.model('CompanyUser', companyUserSchema);
