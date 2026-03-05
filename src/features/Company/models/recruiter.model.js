const mongoose = require('mongoose');

const recruiterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  keySkills: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isInvited: {
    type: Boolean,
    default: false
  },
  invitationAccepted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
recruiterSchema.index({ companyId: 1, isActive: 1 });
recruiterSchema.index({ email: 1, companyId: 1 }, { unique: true });
recruiterSchema.index({ keySkills: 1 });

module.exports = mongoose.model('Recruiter', recruiterSchema);
