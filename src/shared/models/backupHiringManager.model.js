const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Backup Hiring Manager Model
 * Shares the 'BackupHiringManagers' collection with the legacy server.
 */
const backupHiringManagerSchema = new mongoose.Schema(
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
        hiringManagerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HiringManagers',
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
    },
    {
        timestamps: true,
    }
);

/**
 * Static login method — authenticates by email and password.
 * @throws {Error} on invalid credentials
 */
backupHiringManagerSchema.statics.login = async function (email, password) {
    const backupHiringManager = await this.findOne({ email });
    if (backupHiringManager) {
        const auth = await bcrypt.compare(password, backupHiringManager.password);
        if (auth) return backupHiringManager;
    }
    throw new Error('Invalid credentials');
};

const BackupHiringManager =
    mongoose.models.BackupHiringManagers ||
    mongoose.model('BackupHiringManagers', backupHiringManagerSchema);

module.exports = BackupHiringManager;

