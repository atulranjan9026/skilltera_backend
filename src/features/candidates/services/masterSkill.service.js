const MasterSkill = require('../models/masterSkill.model');

class MasterSkillService {
    /**
     * Get all active master skills with optional search
     * @param {string} searchTerm - Optional search term
     * @returns {Promise<Array>} Master skills
     */
    async getAllActiveSkills(searchTerm) {
        let skills;

        if (searchTerm) {
            // Use text search for better performance with partial matching
            skills = await MasterSkill.find({
                name: { $regex: searchTerm, $options: "i" },
                active: true,
            }).lean().limit(10); // Limit results for performance
        } else {
            // Get all active skills
            skills = await MasterSkill.find({ active: true })
                .sort({ name: 1 })
                .lean();
        }

        return skills;
    }

    /**
     * Seed master skills with common skills
     * @returns {Promise<Array>} Created skills
     */
    async seedMasterSkills() {
        const commonSkills = [
            // Programming Languages
            { name: 'JavaScript', category: 'technical' },
            { name: 'Java', category: 'technical' },
            { name: 'Python', category: 'technical' },
            { name: 'TypeScript', category: 'technical' },
            { name: 'C++', category: 'technical' },
            { name: 'C#', category: 'technical' },
            { name: 'PHP', category: 'technical' },
            { name: 'Ruby', category: 'technical' },
            { name: 'Go', category: 'technical' },
            { name: 'Swift', category: 'technical' },
            { name: 'Kotlin', category: 'technical' },
            { name: 'Rust', category: 'technical' },
            
            // Frontend Frameworks
            { name: 'React', category: 'framework' },
            { name: 'Angular', category: 'framework' },
            { name: 'Vue.js', category: 'framework' },
            { name: 'Next.js', category: 'framework' },
            { name: 'Nuxt.js', category: 'framework' },
            { name: 'Svelte', category: 'framework' },
            
            // Backend Frameworks
            { name: 'Node.js', category: 'framework' },
            { name: 'Express.js', category: 'framework' },
            { name: 'Django', category: 'framework' },
            { name: 'Flask', category: 'framework' },
            { name: 'Spring Boot', category: 'framework' },
            { name: 'Laravel', category: 'framework' },
            { name: 'Ruby on Rails', category: 'framework' },
            { name: 'ASP.NET Core', category: 'framework' },
            
            // Databases
            { name: 'MongoDB', category: 'technical' },
            { name: 'MySQL', category: 'technical' },
            { name: 'PostgreSQL', category: 'technical' },
            { name: 'Redis', category: 'technical' },
            { name: 'Elasticsearch', category: 'technical' },
            { name: 'Oracle', category: 'technical' },
            { name: 'SQL Server', category: 'technical' },
            
            // Cloud & DevOps
            { name: 'AWS', category: 'tool' },
            { name: 'Azure', category: 'tool' },
            { name: 'Google Cloud', category: 'tool' },
            { name: 'Docker', category: 'tool' },
            { name: 'Kubernetes', category: 'tool' },
            { name: 'Jenkins', category: 'tool' },
            { name: 'Git', category: 'tool' },
            { name: 'GitHub Actions', category: 'tool' },
            { name: 'Terraform', category: 'tool' },
            { name: 'Ansible', category: 'tool' },
            
            // Tools & Technologies
            { name: 'GraphQL', category: 'technical' },
            { name: 'REST API', category: 'technical' },
            { name: 'Webpack', category: 'tool' },
            { name: 'Vite', category: 'tool' },
            { name: 'Babel', category: 'tool' },
            { name: 'Sass', category: 'tool' },
            { name: 'Tailwind CSS', category: 'tool' },
            { name: 'Bootstrap', category: 'tool' },
            { name: 'Figma', category: 'tool' },
            { name: 'Jira', category: 'tool' },
            
            // Soft Skills
            { name: 'Leadership', category: 'soft' },
            { name: 'Communication', category: 'soft' },
            { name: 'Problem Solving', category: 'soft' },
            { name: 'Teamwork', category: 'soft' },
            { name: 'Time Management', category: 'soft' },
            { name: 'Critical Thinking', category: 'soft' },
            { name: 'Creativity', category: 'soft' },
            { name: 'Adaptability', category: 'soft' },
            
            // Languages
            { name: 'English', category: 'language' },
            { name: 'Spanish', category: 'language' },
            { name: 'French', category: 'language' },
            { name: 'German', category: 'language' },
            { name: 'Chinese', category: 'language' },
            { name: 'Japanese', category: 'language' },
        ];

        const insertedSkills = [];
        for (const skillData of commonSkills) {
            try {
                const skill = await MasterSkill.findOneAndUpdate(
                    { name: skillData.name },
                    skillData,
                    { upsert: true, new: true }
                );
                insertedSkills.push(skill);
            } catch (error) {
                console.warn(`Failed to insert skill ${skillData.name}:`, error.message);
            }
        }

        return insertedSkills;
    }
}

module.exports = new MasterSkillService();
