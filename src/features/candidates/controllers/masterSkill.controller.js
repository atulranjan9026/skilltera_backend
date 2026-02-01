const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const masterSkillService = require('../services/masterSkill.service');

// Seed master skills
exports.seedMasterSkills = asyncHandler(async (req, res) => {
    const skills = await masterSkillService.seedMasterSkills();
    const response = new ApiResponse(HTTP_STATUS.CREATED, { skills }, 'Master skills seeded successfully');
    response.send(res);
});

// Get all active master skills with optional search
exports.getAllActiveSkills = asyncHandler(async (req, res) => {
    const searchTerm = req.query.search;
    const skills = await masterSkillService.getAllActiveSkills(searchTerm);
    const response = new ApiResponse(HTTP_STATUS.OK, { skills }, 'Skills fetched successfully');
    response.send(res);
});
