const MasterSkill = require('../models/masterSkill.model');


class SkillService {
    /**
     * Get all active skills with optional search
     * @param {string} searchTerm - Optional search term
     * @returns {Promise<Array>} Skills
     */
    async getAllActiveSkills(searchTerm) {
        let skills;

        if (searchTerm) {
            // Search by skill name with case-insensitive regex
            skills = await MasterSkill.find({
                name: { $regex: searchTerm, $options: "i" },
                active: true,
            }).lean();
        } else {
            // Get all active skills
            skills = await MasterSkill.find({ active: true })
                .sort({ name: 1 })
                .lean();
        }

        return skills;
    }
}

module.exports = new SkillService();