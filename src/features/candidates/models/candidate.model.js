const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const candidateSchema = new mongoose.Schema(
    {
        // Basic Information
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters long'],
            select: false, // Don't include password in queries by default
        },
        phone: {
            type: String,
            trim: true,
            match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number'],
        },

        // Profile Information
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot exceed 500 characters'],
        },
        avatar: {
            url: String,
            publicId: String,
        },
        location: {
            city: String,
            state: String,
            country: String,
        },
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        },

        // Professional Information
        currentRole: String,
        experience: {
            type: Number, // Total years of experience
            default: 0,
        },
        expectedSalary: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'USD',
            },
        },
        noticePeriod: {
            type: Number, // In days
            default: 0,
        },

        // Resume
        resume: {
            url: String,
            publicId: String,
            filename: String,
            uploadedAt: Date,
        },

        // Skills (references to Skill documents or embedded objects)
        skills: [{
            skillId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Skill',
            },
            experience: { type: Number, default: 0 },
            rating: { type: Number, default: 0 },
            category: String,
            isVerified: { type: Boolean, default: false },
        }],

        // Legacy field
        previousEmployers: [String],

        // Experience (references to Experience documents)
        experiences: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Experience',
            },
        ],

        // Education (references to Education documents)
        education: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Education',
            },
        ],

        // Certificates (references to Certificate documents)
        certificates: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Certificate',
            },
        ],

        // Saved Jobs
        savedJobs: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Job',
            },
        ],

        // Authentication & Security
        role: {
            type: String,
            enum: ['candidate', 'admin'],
            default: 'candidate',
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: String,
        passwordResetToken: String,
        passwordResetExpires: Date,
        refreshTokens: [String], // Store multiple refresh tokens for multi-device support

        // Activity Tracking
        lastLogin: Date,
        isActive: {
            type: Boolean,
            default: true,
        },

        // Profile Strength (calculated field)
        profileStrength: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for performance
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ 'location.city': 1 });
candidateSchema.index({ skills: 1 });
candidateSchema.index({ experience: 1 });

// Virtual for full location
candidateSchema.virtual('fullLocation').get(function () {
    if (!this.location) return '';
    const parts = [this.location.city, this.location.state, this.location.country].filter(Boolean);
    return parts.join(', ');
});

// Pre-save middleware to hash password
candidateSchema.pre('save', async function (next) {
    // Only hash password if it's modified
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to calculate profile strength
candidateSchema.pre('save', function (next) {
    let strength = 0;

    // Basic info (40 points)
    if (this.name) strength += 5;
    if (this.email) strength += 5;
    if (this.phone) strength += 5;
    if (this.bio) strength += 10;
    if (this.avatar?.url) strength += 5;
    if (this.location?.city) strength += 5;
    if (this.currentRole) strength += 5;

    // Professional info (30 points)
    if (this.resume?.url) strength += 15;
    if (this.skills?.length > 0) strength += 10;
    if (this.expectedSalary?.min) strength += 5;

    // Experience & Education (30 points)
    if (this.experiences?.length > 0) strength += 15;
    if (this.education?.length > 0) strength += 10;
    if (this.certificates?.length > 0) strength += 5;

    this.profileStrength = Math.min(strength, 100);
    next();
});

// Instance method to compare password
candidateSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password reset token is valid
candidateSchema.methods.isPasswordResetTokenValid = function () {
    return this.passwordResetExpires && this.passwordResetExpires > Date.now();
};

// Instance method to add refresh token
candidateSchema.methods.addRefreshToken = function (token) {
    if (!this.refreshTokens) {
        this.refreshTokens = [];
    }
    this.refreshTokens.push(token);

    // Keep only last 5 tokens (for multi-device support)
    if (this.refreshTokens.length > 5) {
        this.refreshTokens = this.refreshTokens.slice(-5);
    }
};

// Instance method to remove refresh token
candidateSchema.methods.removeRefreshToken = function (token) {
    if (this.refreshTokens) {
        this.refreshTokens = this.refreshTokens.filter((t) => t !== token);
    }
};

// Instance method to clear all refresh tokens (logout from all devices)
candidateSchema.methods.clearRefreshTokens = function () {
    this.refreshTokens = [];
};

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
