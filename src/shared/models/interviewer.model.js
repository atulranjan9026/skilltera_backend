const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Interviewer Model
 * Shares the 'Interviewers' collection with the legacy server.
 */
const interviewerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            minlength: 3,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Companies',
            required: true,
        },
        active: {
            type: Boolean,
            default: true,
        },
        registrationDate: String,
        lastLoginDate: {
            type: Date,
            default: null,
        },
        lastLoginTime: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Static login method — authenticates by email and password.
 * @throws {Error} on invalid credentials
 */
interviewerSchema.statics.login = async function (email, password) {
    const interviewer = await this.findOne({ email });
    if (interviewer) {
        const auth = await bcrypt.compare(password, interviewer.password);
        if (auth) return interviewer;
    }
    throw new Error('Invalid credentials');
};

const Interviewer =
    mongoose.models.Interviewers ||
    mongoose.model('Interviewers', interviewerSchema);

module.exports = Interviewer;
