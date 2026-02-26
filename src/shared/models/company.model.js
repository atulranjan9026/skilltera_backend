const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * Company Model
 * Represents company information referenced by job postings.
 * Shares the 'Companies' collection with the legacy server.
 */
const companySchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: true,
            index: true,
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
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        active: {
            type: Boolean,
            default: true,
        },
        imageLink: {
            type: String,
            default: null,
        },
        registrationDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient searches
companySchema.index({ companyName: 'text', email: 1 });

/**
 * Static login method — authenticates by companyName, email and password.
 * @throws {Error} on invalid credentials
 */
companySchema.statics.login = async function (companyName, email, password) {
    const company = await this.findOne({ email, companyName });
    if (company) {
        const auth = await bcrypt.compare(password, company.password);
        if (auth) return company;
    }
    throw new Error('Invalid credentials');
};

// Export model - use Companies collection name to match server
const Company = mongoose.models.Companies || mongoose.model('Companies', companySchema);

module.exports = Company;
