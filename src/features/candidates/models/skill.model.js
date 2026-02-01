const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
        },
        rating: {
            type: Number,
            min: [1, 'Rating must be at least 1'],
            max: [10, 'Rating cannot exceed 10'],
            default: 5,
        },
        experienceYears: {
            type: Number,
            min: [0, 'Experience years cannot be negative'],
            default: 0,
        },
        category: {
            type: String,
            enum: ['technical', 'soft', 'language', 'tool', 'framework', 'other'],
            default: 'technical',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for candidate and skill name (prevent duplicates)
skillSchema.index({ candidate: 1, name: 1 }, { unique: true });

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
