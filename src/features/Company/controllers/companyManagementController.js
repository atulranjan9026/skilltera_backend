const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const ApiError = require('../../../shared/utils/ApiError');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

const Company = require('../../../shared/models/company.model');

/**
 * Get all companies with full details
 * @route   GET /api/v1/company/all
 * @access  Private (Admin)
 */
exports.viewAllCompany = asyncHandler(async (req, res) => {
    const companies = await Company.find().select('-password').lean();
    return new ApiResponse(HTTP_STATUS.OK, { companies }, 'Companies fetched successfully').send(res);
});

/**
 * Get all companies - name only (public safe)
 * @route   GET /api/v1/company/list
 * @access  Public
 */
exports.viewAllCompanyList = asyncHandler(async (req, res) => {
    const companies = await Company.find().select('companyName').lean();
    return new ApiResponse(HTTP_STATUS.OK, { companies }, 'Company list fetched successfully').send(res);
});