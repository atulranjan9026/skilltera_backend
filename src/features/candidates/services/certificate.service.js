const Certificate = require('../models/certificate.model');
const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES } = require('../../../shared/constants');

/**
 * Certificate Service
 * Handles candidate certificate operations
 */
class CertificateService {
    /**
     * Add certificate
     * @param {string} candidateId - Candidate ID
     * @param {object} certificateData - Certificate data
     * @returns {Promise<object>} Created certificate
     */
    async addCertificate(candidateId, certificateData) {
        const certificate = await Certificate.create({
            ...certificateData,
            candidate: candidateId,
        });

        await Candidate.findByIdAndUpdate(candidateId, {
            $push: { certificates: certificate._id },
        });

        return certificate;
    }

    /**
     * Update certificate
     * @param {string} candidateId - Candidate ID
     * @param {string} certificateId - Certificate ID
     * @param {object} updateData - Certificate update data
     * @returns {Promise<object>} Updated certificate
     */
    async updateCertificate(candidateId, certificateId, updateData) {
        const certificate = await Certificate.findOneAndUpdate(
            { _id: certificateId, candidate: candidateId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!certificate) {
            throw ApiError.notFound('Certificate not found');
        }

        return certificate;
    }

    /**
     * Delete certificate
     * @param {string} candidateId - Candidate ID
     * @param {string} certificateId - Certificate ID
     * @returns {Promise<void>}
     */
    async deleteCertificate(candidateId, certificateId) {
        const certificate = await Certificate.findOneAndDelete({
            _id: certificateId,
            candidate: candidateId,
        });

        if (!certificate) {
            throw ApiError.notFound('Certificate not found');
        }

        await Candidate.findByIdAndUpdate(candidateId, {
            $pull: { certificates: certificateId },
        });
    }
}

module.exports = new CertificateService();
