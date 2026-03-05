const mongoose = require('mongoose');

const hiringManagerSchema = new mongoose.Schema({
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
hiringManagerSchema.index({ companyId: 1, isActive: 1 });
hiringManagerSchema.index({ email: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('HiringManager', hiringManagerSchema);
