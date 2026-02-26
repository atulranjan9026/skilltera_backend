const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Hiring Manager Model
 * Shares the 'HiringManagers' collection with the legacy server.
 */
const hiringManagerSchema = new mongoose.Schema(
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
        backupManagers: [
            {
                name: { type: String, required: true },
                email: { type: String, required: true },
            },
        ],
        active: {
            type: Boolean,
            default: true,
        },
        registrationDate: String,
        lastLoginDate: {
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
hiringManagerSchema.statics.login = async function (email, password) {
    const hiringManager = await this.findOne({ email });
    if (hiringManager) {
        const auth = await bcrypt.compare(password, hiringManager.password);
        if (auth) return hiringManager;
    }
    throw new Error('Invalid credentials');
};

const HiringManager =
    mongoose.models.HiringManagers ||
    mongoose.model('HiringManagers', hiringManagerSchema);

module.exports = HiringManager;
