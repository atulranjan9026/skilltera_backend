const Skill = require('../models/skill.model');

class SkillService {
    /**
     * Get all active master skills with optional search
     * @param {string} searchTerm - Optional search term
     * @returns {Promise<Array>} Master skills
     */

    async getAllActiveSkills(searchTerm) {
        let skills;
        if (searchTerm) {
            // Use text search for better performance with partial matching
            skills = await Skill.find({
                skill: { $regex: searchTerm, $options: "i" },
                active: true,
            }).lean().limit(10); // Limit results for performance
        } else {
            // Get all active skills
            skills = await Skill.find({ active: true })
                .sort({ skill: 1 })
                .lean();
        }

        return skills;
    }
}

module.exports = new SkillService();
