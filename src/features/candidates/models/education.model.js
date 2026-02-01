const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate',
            required: true,
        },
        institution: {
            type: String,
            required: [true, 'Institution name is required'],
            trim: true,
        },
        degree: {
            type: String,
            required: [true, 'Degree is required'],
            trim: true,
        },
        fieldOfStudy: {
            type: String,
            required: [true, 'Field of study is required'],
            trim: true,
        },
        location: {
            city: String,
            state: String,
            country: String,
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
        },
        endDate: Date,
        isCurrentlyStudying: {
            type: Boolean,
            default: false,
        },
        grade: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        activities: [String],
    },
    {
        timestamps: true,
    }
);

// Index for candidate
educationSchema.index({ candidate: 1, startDate: -1 });

const Education = mongoose.model('Education', educationSchema);

module.exports = Education;
