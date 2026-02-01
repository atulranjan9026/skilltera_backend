const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
        },
        company: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
        },
        position: {
            type: String,
            required: [true, 'Position is required'],
            trim: true,
        },
        location: {
            city: String,
            state: String,
            country: String,
        },
        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
            default: 'full-time',
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
        },
        endDate: Date,
        isCurrentlyWorking: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        responsibilities: [String],
        achievements: [String],
        skills: [String],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for duration
experienceSchema.virtual('duration').get(function () {
    const end = this.isCurrentlyWorking ? new Date() : this.endDate;
    if (!end) return null;

    const months = Math.floor((end - this.startDate) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) {
        return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (years > 0) {
        return `${years} year${years > 1 ? 's' : ''}`;
    } else {
        return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
});

// Index for candidate
experienceSchema.index({ candidate: 1, startDate: -1 });

const Experience = mongoose.model('Experience', experienceSchema);

module.exports = Experience;
