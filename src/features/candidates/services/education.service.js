const Education = require('../models/education.model');
const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');

/**
 * Education Service
 * Handles candidate education operations
 */
class EducationService {
    /**
     * Add education
     * @param {string} candidateId - Candidate ID
     * @param {object} educationData - Education data
     * @returns {Promise<object>} Created education
     */
    async addEducation(candidateId, educationData) {
        const education = await Education.create({
            ...educationData,
            candidate: candidateId,
        });

        await Candidate.findByIdAndUpdate(candidateId, {
            $push: { education: education._id },
        });

        return education;
    }

    /**
     * Update education
     * @param {string} candidateId - Candidate ID
     * @param {string} educationId - Education ID
     * @param {object} updateData - Education update data
     * @returns {Promise<object>} Updated education
     */
    async updateEducation(candidateId, educationId, updateData) {
        const education = await Education.findOneAndUpdate(
            { _id: educationId, candidate: candidateId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!education) {
            throw ApiError.notFound('Education not found');
        }

        return education;
    }

    /**
     * Delete education
     * @param {string} candidateId - Candidate ID
     * @param {string} educationId - Education ID
     * @returns {Promise<void>}
     */
    async deleteEducation(candidateId, educationId) {
        const education = await Education.findOneAndDelete({
            _id: educationId,
            candidate: candidateId,
        });

        if (!education) {
            throw ApiError.notFound('Education not found');
        }

        await Candidate.findByIdAndUpdate(candidateId, {
            $pull: { education: educationId },
        });
    }
}

module.exports = new EducationService();
