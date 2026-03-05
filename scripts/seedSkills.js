const mongoose = require('mongoose');
const Skill = require('../src/features/candidates/models/skill.model');

// Sample skills data - simplified to match existing model
const sampleSkills = [
  'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'SQL', 'MongoDB', 'TypeScript',
  'AWS', 'Docker', 'Git', 'HTML', 'CSS', 'Vue.js', 'Angular', 'Express.js',
  'PostgreSQL', 'REST API', 'GraphQL', 'Communication', 'Leadership',
  'Problem Solving', 'Teamwork', 'Time Management'
];

async function seedSkills() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skilltera');
    console.log('Connected to MongoDB');

    // Clear existing skills
    await Skill.deleteMany({});
    console.log('Cleared existing skills');

    // Insert sample skills using the existing model structure
    const skillDocs = sampleSkills.map(skillName => ({
      skill: skillName,
      active: true
    }));

    const insertedSkills = await Skill.insertMany(skillDocs);
    console.log(`Inserted ${insertedSkills.length} skills`);

    console.log('Skills seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding skills:', error);
    process.exit(1);
  }
}

seedSkills();
