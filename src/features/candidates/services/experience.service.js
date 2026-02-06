const Experience = require('../models/experience.model');
const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');

/**
 * Experience Service
 * Handles candidate experience operations
 */
class ExperienceService {
    /**
     * Add experience
     * @param {string} candidateId - Candidate ID
     * @param {object} experienceData - Experience data
     * @returns {Promise<object>} Created experience
     */
    async addExperience(candidateId, experienceData) {
        const experience = await Experience.create({
            ...experienceData,
            candidate: candidateId,
        });

        await Candidate.findByIdAndUpdate(candidateId, {
            $push: { experiences: experience._id },
        });

        return experience;
    }

    /**
     * Update experience
     * @param {string} candidateId - Candidate ID
     * @param {string} experienceId - Experience ID
     * @param {object} updateData - Experience update data
     * @returns {Promise<object>} Updated experience
     */
    async updateExperience(candidateId, experienceId, updateData) {
        const experience = await Experience.findOneAndUpdate(
            { _id: experienceId, candidate: candidateId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!experience) {
            throw ApiError.notFound('Experience not found');
        }

        return experience;
    }

    /**
     * Delete experience
     * @param {string} candidateId - Candidate ID
     * @param {string} experienceId - Experience ID
     * @returns {Promise<void>}
     */
    async deleteExperience(candidateId, experienceId) {
        const experience = await Experience.findOneAndDelete({
            _id: experienceId,
            candidate: candidateId,
        });

        if (!experience) {
            throw ApiError.notFound('Experience not found');
        }

        await Candidate.findByIdAndUpdate(candidateId, {
            $pull: { experiences: experienceId },
        });
    }
}

module.exports = new ExperienceService();
