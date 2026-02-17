const educations = require('../models/education.model');
const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');

/**
 * educations Service
 * Handles candidate education operations
 */
class EducationService {
    /**
     * Add education
     * @param {string} candidateId - Candidate ID
     * @param {object} educationData - educations data
     * @returns {Promise<object>} Created education
     */
    async addEducation(candidateId, educationData) {
        const education = await educations.create({
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
     * @param {string} educationId - educations ID
     * @param {object} updateData - educations update data
     * @returns {Promise<object>} Updated education
     */
    async updateEducation(candidateId, educationId, updateData) {
        const education = await educations.findOneAndUpdate(
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
     * @param {string} educationId - educations ID
     * @returns {Promise<void>}
     */
    async deleteEducation(candidateId, educationId) {
        console.log('Deleting education:', { candidateId, educationId });
        
        const education = await educations.findOneAndDelete({
            _id: educationId,
            candidate: candidateId,
        });

        console.log('Found education:', education);

        if (!education) {
            // Try to find education without candidate filter to see if it exists
            const anyEducation = await educations.findById(educationId);
            console.log('Education exists without candidate filter:', anyEducation);
            
            throw ApiError.notFound('Education not found or does not belong to candidate');
        }

        await Candidate.findByIdAndUpdate(candidateId, {
            $pull: { education: educationId },
        });
        
        console.log('Education deleted successfully');
    }
}

module.exports = new EducationService();
