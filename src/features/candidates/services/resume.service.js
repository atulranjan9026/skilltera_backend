const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');
const { uploadFile, deleteFile } = require('../../../config/storage');

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
            await deleteFile(candidate.resume.publicId, 'raw');
        }

        // Upload new resume (Cloudinary if configured, else local storage)
        const result = await uploadFile(fileBuffer, 'skilltera/resumes', 'raw', filename);

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
            await deleteFile(candidate.resume.publicId, 'raw');
        }

        candidate.resume = undefined;
        await candidate.save();

        return candidate;
    }
}

module.exports = new ResumeService();
