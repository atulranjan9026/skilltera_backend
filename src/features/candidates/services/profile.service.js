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
            .populate('skills.skillId', 'name skillName')
            .populate('experiences')
            .populate('education')
            .populate('certificates')
            .select('-password -refreshTokens');

        if (!candidate) {
            throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Transform to plain object
        const candidateObject = candidate.toObject();

        // Transform skills array to only include essential fields
        if (candidateObject.skills && Array.isArray(candidateObject.skills)) {
            candidateObject.skills = candidateObject.skills
                .map(skill => ({
                    id: skill._id || skill.id,
                    experience: skill.experience,
                    rating: skill.rating,
                    skillName: skill.skillId?.name || skill.skillId?.skillName || null,
                    isVerified: skill.isVerified
                }));
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

        // Add skill to candidate's skills array using findByIdAndUpdate to avoid validation errors on other fields
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
        const skill = await Skill.findOneAndUpdate(
            { _id: skillId, candidate: candidateId },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!skill) {
            throw ApiError.notFound('Skill not found');
        }

        return skill;
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

        // Check if skill exists in candidate's profile (manual check since we're using findByIdAndUpdate)
        const skillExists = candidate.skills.some(
            s => s._id && s._id.toString() === skillEntryId.toString()
        );

        if (!skillExists) {
            throw ApiError.notFound('Skill not found in your profile');
        }

        // Remove the skill from array using findByIdAndUpdate
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

module.exports = new ProfileService();
