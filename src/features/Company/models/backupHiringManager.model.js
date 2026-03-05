const mongoose = require('mongoose');

const backupHiringManagerSchema = new mongoose.Schema({
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
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  hiringManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HiringManager'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
backupHiringManagerSchema.index({ companyId: 1, isActive: 1 });
backupHiringManagerSchema.index({ email: 1, companyId: 1 }, { unique: true });
backupHiringManagerSchema.index({ hiringManagerId: 1 });

module.exports = mongoose.model('BackupHiringManager', backupHiringManagerSchema);
