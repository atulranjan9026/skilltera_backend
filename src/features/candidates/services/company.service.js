const mongoose = require('mongoose');
const ApiError = require('../../../shared/utils/ApiError');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

// Define company schema inline since model was deleted
const companySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        trim: true
    },
    isApproved: {
        type: Boolean,
        default: false,
        index: true
    },
    active: {
        type: Boolean,
        default: true,
        index: true
    },
    registrationDate: {
        type: String
    }
}, {
    timestamps: true,
    collection: 'companies' // Explicitly set collection name
});

const Company = mongoose.model('Company', companySchema);

class CompanyService {
    /**
     * Get all companies with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Object} Companies with pagination
     */
    async getCompanies(options = {}) {
        const {
            page = 1,
            limit = 20,
            search,
            industry,
            active = true
        } = options;

        const skip = (page - 1) * limit;

        // Build query
        const query = {};
        if (active !== undefined) {
            query.active = active;
        }

        if (search) {
            query.$or = [
                { companyName: { $regex: search, $options: 'i' } }
            ];
        }

        if (industry) {
            query.industry = industry;
        }

        const [companies, total] = await Promise.all([
            Company.find(query)
                .select('companyName email isApproved active registrationDate')
                .sort({ companyName: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Company.countDocuments(query)
        ]);

        return {
            companies,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalCompanies: total,
                limit,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        };
    }

    /**
     * Get company by ID
     * @param {string} companyId - Company ID
     * @returns {Object} Company details
     */
    async getCompanyById(companyId) {
        const company = await Company.findById(companyId)
            .select('companyName email isApproved active registrationDate')
            .lean();

        if (!company) {
            throw ApiError.notFound('Company not found');
        }

        return company;
    }

    /**
     * Search companies by text query
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results
     */
    async searchCompanies(query, options = {}) {
        const { limit = 10 } = options;

        const searchQuery = {
            active: true,
            $or: [
                { companyName: { $regex: query, $options: 'i' } }
            ]
        };

        return Company.find(searchQuery)
            .select('companyName email isApproved active registrationDate')
            .limit(limit)
            .sort({ companyName: 1 })
            .lean();
    }

    /**
     * Get company by name (exact match or partial)
     * @param {string} name - Company name
     * @returns {Object} Company details
     */
    async getCompanyByName(name) {
        // Try exact match first
        let company = await Company.findOne({
            companyName: { $regex: `^${name}$`, $options: 'i' }
        }).lean();

        // If no exact match, try partial match
        if (!company) {
            company = await Company.findOne({
                companyName: { $regex: name, $options: 'i' }
            }).lean();
        }

        return company;
    }

    /**
     * Create or update company
     * @param {Object} companyData - Company data
     * @returns {Object} Created/updated company
     */
    async upsertCompany(companyData) {
        const { companyName, ...otherData } = companyData;

        const company = await Company.findOneAndUpdate(
            { companyName: { $regex: `^${companyName}$`, $options: 'i' } },
            { ...otherData, companyName },
            { upsert: true, new: true, runValidators: true }
        );

        return company;
    }
}

module.exports = new CompanyService();