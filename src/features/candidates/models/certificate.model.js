const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Certificate name is required'],
            trim: true,
        },
        issuingOrganization: {
            type: String,
            required: [true, 'Issuing organization is required'],
            trim: true,
        },
        issueDate: {
            type: Date,
            required: [true, 'Issue date is required'],
        },
        expiryDate: Date,
        credentialId: {
            type: String,
            trim: true,
        },
        credentialUrl: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        skills: [String],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for isExpired
certificateSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return this.expiryDate < new Date();
});

// Index for candidate
certificateSchema.index({ candidate: 1, issueDate: -1 });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
