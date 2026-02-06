const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const companyService = require('../services/company.service');

/**
 * @route   GET /api/v1/candidate/companies
 * @desc    Get all active companies with pagination and search
 * @access  Private
 */
exports.getCompanies = asyncHandler(async (req, res) => {
    const result = await companyService.getCompanies(req.query);
    
    const response = new ApiResponse(
        HTTP_STATUS.OK,
        result,
        'Companies retrieved successfully'
    );
    
    response.send(res);
});

/**
 * @route   GET /api/v1/candidate/companies/:companyId
 * @desc    Get company by ID
 * @access  Private
 */
exports.getCompanyById = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    
    const company = await companyService.getCompanyById(companyId);
    
    const response = new ApiResponse(
        HTTP_STATUS.OK,
        company,
        'Company retrieved successfully'
    );
    
    response.send(res);
});

/**
 * @route   POST /api/v1/candidate/companies
 * @desc    Create or update company
 * @access  Private
 */
exports.upsertCompany = asyncHandler(async (req, res) => {
    const company = await companyService.upsertCompany(req.body);
    
    const response = new ApiResponse(
        HTTP_STATUS.CREATED,
        company,
        'Company created/updated successfully'
    );
    
    response.send(res);
});
