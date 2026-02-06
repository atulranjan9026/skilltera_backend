const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const SkillService = require('../services/skill.service');
const ProfileService = require('../services/profile.service');


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

exports.addSkillToCandidate = asyncHandler(async (req, res) => {
    try {
        const { skillId, experience, rating } = req.body;
        const candidateId = req.user.id;

        const updatedCandidate = await ProfileService.addSkill(candidateId, skillId, experience, rating);

        const response = new ApiResponse(
            HTTP_STATUS.OK,
            updatedCandidate,
            'Skill added successfully'
        );
        response.send(res);
    } catch (error) {
        const response = new ApiResponse(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            null,
            error.message || 'Failed to add skill'
        );
        response.send(res);
    }
});

exports.deleteSkillFromCandidate = asyncHandler(async (req, res) => {
    try {
        const { skillEntryId } = req.params; // The _id of the skill in the skills array
        const candidateId = req.user.id;

        const updatedCandidate = await ProfileService.deleteSkill(candidateId, skillEntryId);

        const response = new ApiResponse(
            HTTP_STATUS.OK,
            updatedCandidate,
            'Skill deleted successfully'
        );
        response.send(res);
    } catch (error) {
        const response = new ApiResponse(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            null,
            error.message || 'Failed to delete skill'
        );
        response.send(res);
    }
});





