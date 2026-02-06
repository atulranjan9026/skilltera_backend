const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../../config/cloudinary');

/**
 * Resume Service
 * Handles candidate resume operations
 */
class ResumeService {
    /**
     * Upload resume
     * @param {string} candidateId - Candidate ID
     * @param {Buffer} fileBuffer - Resume file buffer
     * @param {string} filename - Original filename
     * @returns {Promise<object>} Updated candidate
     */
    async uploadResume(candidateId, fileBuffer, filename) {
        const candidate = await Candidate.findById(candidateId);

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Delete old resume if exists
        if (candidate.resume?.publicId) {
            await deleteFromCloudinary(candidate.resume.publicId, 'raw');
        }

        // Upload new resume
        const result = await uploadToCloudinary(fileBuffer, 'skilltera/resumes', 'raw');

        candidate.resume = {
            url: result.secure_url,
            publicId: result.public_id,
            filename,
            uploadedAt: new Date(),
        };

        await candidate.save();

        return candidate;
    }

    /**
     * Delete resume
     * @param {string} candidateId - Candidate ID
     * @returns {Promise<object>} Updated candidate
     */
    async deleteResume(candidateId) {
        const candidate = await Candidate.findById(candidateId);

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (candidate.resume?.publicId) {
            await deleteFromCloudinary(candidate.resume.publicId, 'raw');
        }

        candidate.resume = undefined;
        await candidate.save();

        return candidate;
    }
}

module.exports = new ResumeService();
