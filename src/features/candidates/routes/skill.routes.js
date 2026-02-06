const express = require('express');
const router = express.Router();

const skillController = require('../controllers/skill.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

// Public routes
// Get all active skills (for search/autocomplete)
router.get('/allActiveSkills', skillController.getAllActiveSkills);

// Protected routes (require authentication)
// Add skill to candidate profile
router.post('/add', authenticate, skillController.addSkillToCandidate);

// Delete skill from candidate profile
router.delete('/:skillEntryId', authenticate, skillController.deleteSkillFromCandidate);

module.exports = router;