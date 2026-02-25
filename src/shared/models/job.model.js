const mongoose = require('mongoose');

/**
 * Job Schema
 * Represents job postings with optimized indexes for fast retrieval
 */
const jobSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Companies',
        required: true,
        index: true
    },
    companyName: {
        type: String,
        required: true
    },

    // Job Details
    jobType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'Fulltime', 'Part Time', 'Contract', 'Internship', 'Freelance'],
        default: 'full-time',
        index: true
    },
    experienceLevel: {
        type: String,
        enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
        default: 'mid'
    },
    minExperience: {
        type: Number,
        default: 0
    },
    maxExperience: {
        type: Number,
        default: 20
    },

    // Location
    location: {
        city: { type: String, index: true },
        state: String,
        country: { type: String, index: true },
        isRemote: { type: Boolean, default: false, index: true },
        remoteType: {
            type: String,
            enum: ['fully-remote', 'hybrid', 'on-site'],
            default: 'on-site'
        }
    },

    // Skills
    requiredSkills: [{
        skillId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill',
            required: true
        },
        skillName: String,
        experience: { type: Number, default: 0 }, // Years of experience required
        rating: { type: Number, min: 1, max: 5, default: 3 }, // Importance rating
        isMandatory: { type: Boolean, default: true }
    }],
    optionalSkills: [{
        skillId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill'
        },
        skillName: String,
        experience: { type: Number, default: 0 },
        rating: { type: Number, min: 1, max: 5, default: 2 }
    }],

    // Salary
    salary: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'USD' },
        period: { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' }
    },

    // Application Details
    applicationDeadline: {
        type: Date,
        index: true
    },
    openings: {
        type: Number,
        default: 1,
        min: 1
    },
    applicationsCount: {
        type: Number,
        default: 0
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'closed', 'on-hold', 'APPROVED'],
        default: 'active',
        index: true
    },

    // Additional Information
    benefits: [String],
    responsibilities: [String],
    qualifications: [String],

    // Metadata
    postedDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    views: {
        type: Number,
        default: 0
    },

    // SEO & Search
    tags: [String],
    category: String,

}, {
    timestamps: true
});

// Compound Indexes for Performance Optimization
// 1. Active jobs with deadline - Most common query
jobSchema.index({ isActive: 1, applicationDeadline: 1 });

// 2. Skill-based searches - For matching candidates
jobSchema.index({ 'requiredSkills.skillId': 1, isActive: 1 });

// 3. Location-based searches
jobSchema.index({ 'location.city': 1, 'location.country': 1, isActive: 1 });

// 4. Recent jobs first
jobSchema.index({ postedDate: -1, isActive: 1 });

// 5. Company jobs
jobSchema.index({ companyId: 1, isActive: 1, postedDate: -1 });

// 6. Job type and experience level
jobSchema.index({ jobType: 1, experienceLevel: 1, isActive: 1 });

// 7. Remote jobs
jobSchema.index({ 'location.isRemote': 1, isActive: 1 });

// 8. Text search on title and description
jobSchema.index({ title: 'text', description: 'text', companyName: 'text' });

// Virtual for days since posted
jobSchema.virtual('daysSincePosted').get(function () {
    return Math.floor((Date.now() - this.postedDate) / (1000 * 60 * 60 * 24));
});

// Virtual for application status
jobSchema.virtual('isExpired').get(function () {
    return this.applicationDeadline && this.applicationDeadline < Date.now();
});

// Pre-save middleware to update lastUpdated
jobSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

// Method to increment view count
jobSchema.methods.incrementViews = async function () {
    return this.constructor.findByIdAndUpdate(
        this._id,
        { $inc: { views: 1 } },
        { new: true, validateBeforeSave: false }
    );
};

// Method to increment applications count
jobSchema.methods.incrementApplications = async function () {
    return this.constructor.findByIdAndUpdate(
        this._id,
        { $inc: { applicationsCount: 1 } },
        { new: true, validateBeforeSave: false }
    );
};

// Static method to find active jobs
jobSchema.statics.findActiveJobs = function (filters = {}) {
    const query = { isActive: true, status: 'active' };

    // Add deadline filter
    if (!filters.includeExpired) {
        query.$or = [
            { applicationDeadline: { $gte: new Date() } },
            { applicationDeadline: null }
        ];
    }

    return this.find(query);
};

module.exports = mongoose.model('Job', jobSchema);
