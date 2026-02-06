const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skill.controller');
// const masterSkillController = require('../controllers/masterSkill.controller');

// All Active Skills
router.get('/allActiveSkills', skillController.getAllActiveSkills);

// Seed master skills (for development)
// router.post('/seed', masterSkillController.seedMasterSkills);

module.exports = router;