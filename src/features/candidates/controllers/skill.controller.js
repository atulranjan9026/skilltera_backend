const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const SkillService = require('../services/skill.service');


exports.getAllActiveSkills = asyncHandler(async (req, res) => {
    try {
        const { search } = req.query;
        const skills = await SkillService.getAllActiveSkills(search);
        const response = new ApiResponse(HTTP_STATUS.OK, { skills }, 'Skills fetched successfully');
        response.send(res);
    } catch (error) {
        const response = new ApiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, null, 'Failed to fetch skills');
        response.send(res);
    }
});


