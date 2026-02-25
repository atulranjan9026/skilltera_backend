const mongoose = require('mongoose');

/**
 * Company Model
 * Represents company information referenced by job postings
 */
const companySchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        active: {
            type: Boolean,
            default: true,
        },
        imageLink: {
            type: String,
            default: null,
        },
        registrationDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient searches
companySchema.index({ companyName: 'text', email: 1 });

// Export model - use Companies collection name to match server
const Company = mongoose.models.Companies || mongoose.model('Companies', companySchema);

module.exports = Company;
