const Candidate = require('../models/candidate.model');
const Skill = require('../models/skill.model');
const Experience = require('../models/experience.model');
const Education = require('../models/education.model');
const Certificate = require('../models/certificate.model');
const ApiError = require('../../../shared/utils/ApiError');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../shared/constants');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../../config/cloudinary');

/**
 * Profile Service
 * Contains business logic for profile operations
 */
class ProfileService {
    /**
     * Get candidate profile
     * @param {string} candidateId - Candidate ID
     * @returns {Promise<object>} Candidate profile
     */
    async getProfile(candidateId) {
        const candidate = await Candidate.findById(candidateId)
            .populate('skills.skillId', 'skill name')
            .populate('experiences')
            .populate('education')
            .populate('certificates')
            .select('-password -refreshTokens');

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Transform to plain object
        const candidateObject = candidate.toObject();

        // Transform skills array - Handle both populated and unpopulated cases
        if (candidateObject.skills && Array.isArray(candidateObject.skills)) {
            // console.log('Profile Skills', candidateObject.skills);
            candidateObject.skills = candidateObject.skills.map(skill => {
                // Handle populated skillId (object)
                if (skill.skillId && typeof skill.skillId === 'object') {
                    return {
                        skillId: skill.skillId._id,  // Keep the ID for updates/deletes
                        skillName: skill.skillId.skill || 'Unknown Skill Profile', // The actual skill name
                        id: skill._id,
                        experience: skill.experience || 0,
                        rating: skill.rating || 0,
                        isVerified: skill.isVerified || false
                    };
                }

                // Handle unpopulated skillId (just ObjectId)
                return {
                    skillId: skill.skillId,
                    skillName: null, // Will need to populate separately
                    experience: skill.experience || 0,
                    rating: skill.rating || 0,
                    isVerified: skill.isVerified || false
                };
            });
        }

        return candidateObject;
    }

    /**
     * Update candidate profile
     * @param {string} candidateId - Candidate ID
     * @param {object} updateData - Profile update data
     * @returns {Promise<object>} Updated candidate
     */
    async updateProfile(candidateId, updateData) {
        // Transform frontend data to match backend schema
        const transformedData = { ...updateData };

        // Map fullname to name (frontend uses fullname, backend uses name)
        if (transformedData.fullname) {
            transformedData.name = transformedData.fullname;
            delete transformedData.fullname;
        }

        // Remove experiences/education/skills arrays if present
        // These should be updated via separate endpoints (addExperience, addSkill, etc.)
        delete transformedData.experiences;
        delete transformedData.education;
        delete transformedData.skills;

        // Map overallExperience to experience (total years)
        if (transformedData.overallExperience !== undefined) {
            transformedData.experience = transformedData.overallExperience;
            delete transformedData.overallExperience;
        }

        // Map currentCity/country to location object
        if (transformedData.currentCity || transformedData.country) {
            transformedData.location = {
                city: transformedData.currentCity,
                country: transformedData.country,
            };
            delete transformedData.currentCity;
            delete transformedData.country;
        }

        // Map currentCompany to currentRole
        if (transformedData.currentCompany) {
            transformedData.currentRole = transformedData.currentCompany;
            delete transformedData.currentCompany;
        }

        // Handle expectedSalary - ensure it's in the correct format
        if (transformedData.expectedSalary) {
            const salary = transformedData.expectedSalary;
            if (typeof salary === 'string' || typeof salary === 'number') {
                transformedData.expectedSalary = {
                    min: parseInt(salary),
                    max: parseInt(salary) * 1.2, // 20% range
                    currency: 'USD',
                };
            }
        }

        const candidate = await Candidate.findByIdAndUpdate(
            candidateId,
            { $set: transformedData },
            { new: true, runValidators: true }
        ).select('-password -refreshTokens');

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return candidate;
    }

    /**
     * Upload profile avatar
     * @param {string} candidateId - Candidate ID
     * @param {Buffer} fileBuffer - Image file buffer
     * @returns {Promise<object>} Updated candidate
     */
    async uploadAvatar(candidateId, fileBuffer) {
        const candidate = await Candidate.findById(candidateId);

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Delete old avatar if exists
        if (candidate.avatar?.publicId) {
            await deleteFromCloudinary(candidate.avatar.publicId);
        }

        // Upload new avatar
        const result = await uploadToCloudinary(fileBuffer, 'skilltera/avatars', 'image');

        candidate.avatar = {
            url: result.secure_url,
            publicId: result.public_id,
        };

        await candidate.save();

        return candidate;
    }

    // All specific additions (skills, education, etc.) have been moved to their respective services
}

module.exports = new ProfileService();
