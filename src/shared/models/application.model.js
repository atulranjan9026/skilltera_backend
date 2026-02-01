const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
        },
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
        },
        status: {
            type: String,
            enum: ['applied', 'shortlisted', 'interviewed', 'selected', 'rejected', 'withdrawn'],
            default: 'applied',
        },
        coverLetter: {
            type: String,
            maxlength: [1000, 'Cover letter cannot exceed 1000 characters'],
        },
        resume: {
            url: String,
            publicId: String,
            filename: String,
        },
        matchScore: {
            type: Number,
            min: 0,
            max: 100,
        },
        appliedAt: {
            type: Date,
            default: Date.now,
        },
        statusHistory: [
            {
                status: {
                    type: String,
                    enum: ['applied', 'shortlisted', 'interviewed', 'selected', 'rejected', 'withdrawn'],
                },
                changedAt: {
                    type: Date,
                    default: Date.now,
                },
                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    refPath: 'statusHistory.changedByModel',
                },
                changedByModel: {
                    type: String,
                    enum: ['Candidate', 'Company', 'Admin'],
                },
                notes: String,
            },
        ],
        withdrawnAt: Date,
        withdrawnReason: String,
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate applications
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });
applicationSchema.index({ candidate: 1, status: 1 });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });

// Pre-save middleware to add status to history
applicationSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            changedAt: new Date(),
        });
    }
    next();
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
