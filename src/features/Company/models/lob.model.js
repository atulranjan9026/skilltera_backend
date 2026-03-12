const mongoose = require('mongoose');

const lobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Companies',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Companies'
  }
}, {
  timestamps: true
});

// Index for efficient queries
lobSchema.index({ companyId: 1, isActive: 1 });
lobSchema.index({ name: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('LOB', lobSchema);
