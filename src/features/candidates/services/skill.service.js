const Skill = require('../models/skill.model');
const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');

class SkillService {
    /**
     * Get all active skills by search term
     * @param {string} search - Search term
     * @returns {Promise<Array>} List of active skills
     */
    async getAllActiveSkills(search) {
        let query = { active: true };

        if (search) {
            query.skill = { $regex: search, $options: 'i' };
        }

        return await Skill.find(query).select('skill');
    }

    /**
     * Add skill to candidate
     * @param {string} candidateId - Candidate ID
     * @param {string} skillId - Skill ID from master skills collection
     * @param {number} experience - Years of experience
     * @param {number} rating - Skill rating (1-5)
     * @returns {Promise<object>} Updated candidate
     */
    async addSkill(candidateId, skillId, experience, rating) {
        // Validate input
        if (!skillId) {
            throw ApiError.badRequest('Skill ID is required');
        }
        if (experience < 0 || experience > 50) {
            throw ApiError.badRequest('Experience must be between 0 and 50 years');
        }
        if (rating < 1 || rating > 5) {
            throw ApiError.badRequest('Rating must be between 1 and 5');
        }

        // Check if skill exists in master skills
        const skillExists = await Skill.findById(skillId);
        if (!skillExists) {
            throw ApiError.notFound('Skill not found in master skills');
        }

        // Get candidate
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check if skill already exists
        const skillAlreadyExists = candidate.skills.some(
            s => s.skillId && s.skillId.toString() === skillId.toString()
        );

        if (skillAlreadyExists) {
            throw ApiError.badRequest('Skill already exists in your profile');
        }

        // Add skill using findByIdAndUpdate to avoid full document validation
        await Candidate.findByIdAndUpdate(candidateId, {
            $push: {
                skills: {
                    skillId: skillId,
                    experience: experience,
                    rating: rating,
                    isVerified: false
                }
            }
        });

        // Populate and return updated candidate
        const updatedCandidate = await Candidate.findById(candidateId)
            .populate('skills.skillId', 'skill')
            .select('-password -refreshTokens');

        // Transform skills for response
        const candidateObject = updatedCandidate.toObject();
        if (candidateObject.skills && Array.isArray(candidateObject.skills)) {
            candidateObject.skills = candidateObject.skills.map(skill => ({
                id: skill._id || skill.id,
                experience: skill.experience,
                rating: skill.rating,
                skillName: skill.skillId?.skill || skill.skillId?.name || null,
                isVerified: skill.isVerified
            }));
        }

        return candidateObject;
    }

    /**
     * Update skill
     * @param {string} candidateId - Candidate ID
     * @param {string} skillId - Skill ID
     * @param {object} updateData - Skill update data
     * @returns {Promise<object>} Updated skill
     */
    async updateSkill(candidateId, skillId, updateData) {
        const candidate = await Candidate.findOneAndUpdate(
            { _id: candidateId, 'skills._id': skillId },
            {
                $set: {
                    'skills.$.experience': updateData.experience,
                    'skills.$.rating': updateData.rating
                }
            },
            { new: true }
        );

        if (!candidate) {
            throw ApiError.notFound('Skill not found');
        }

        return candidate.skills.find(s => s._id.toString() === skillId);
    }

    /**
     * Delete skill from candidate
     * @param {string} candidateId - Candidate ID
     * @param {string} skillEntryId - Skill entry ID (the _id of the skill in the skills array)
     * @returns {Promise<object>} Updated candidate
     */
    async deleteSkill(candidateId, skillEntryId) {
        // Get candidate
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Check if skill exists (manual check since we're using findByIdAndUpdate)
        const skillExists = candidate.skills.some(
            s => s._id && s._id.toString() === skillEntryId.toString()
        );

        if (!skillExists) {
            throw ApiError.notFound('Skill not found in your profile');
        }

        // Remove the skill using findByIdAndUpdate
        await Candidate.findByIdAndUpdate(candidateId, {
            $pull: {
                skills: { _id: skillEntryId }
            }
        });

        // Populate and return updated candidate
        const updatedCandidate = await Candidate.findById(candidateId)
            .populate('skills.skillId', 'skill')
            .select('-password -refreshTokens');

        // Transform skills for response
        const candidateObject = updatedCandidate.toObject();
        if (candidateObject.skills && Array.isArray(candidateObject.skills)) {
            candidateObject.skills = candidateObject.skills.map(skill => ({
                id: skill._id || skill.id,
                experience: skill.experience,
                rating: skill.rating,
                skillName: skill.skillId?.skill || skill.skillId?.name || null,
                isVerified: skill.isVerified
            }));
        }

        return candidateObject;
    }
}

module.exports = new SkillService();
