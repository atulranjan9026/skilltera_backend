const express = require('express');
const router = express.Router();

const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const { validateJoi } = require('../../../shared/middleware/validate.middleware');
const { uploadSingle } = require('../../../shared/middleware/upload.middleware');

const {
    updateProfileSchema,
    addSkillSchema,
    updateSkillSchema,
    addExperienceSchema,
    updateExperienceSchema,
    addEducationSchema,
    addCertificateSchema,
} = require('../validators/profile.validator');

/**
 * Profile Routes
 * Base path: /api/v1/candidates/profile
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Profile
router.get('/', profileController.getProfile);
router.patch('/', validateJoi(updateProfileSchema, 'body'), profileController.updateProfile);
router.post('/avatar', uploadSingle('avatar'), profileController.uploadAvatar);

// Skills
router.get('/allActiveSkills', profileController.getAllActiveSkills);
router.post('/skills', validateJoi(addSkillSchema, 'body'), profileController.addSkill);
router.put('/skills/:id', validateJoi(updateSkillSchema, 'body'), profileController.updateSkill);
router.delete('/skills/:id', profileController.deleteSkill);


// Experience
router.post('/experience', validateJoi(addExperienceSchema, 'body'), profileController.addExperience);
router.put('/experience/:id', validateJoi(updateExperienceSchema, 'body'), profileController.updateExperience);
router.delete('/experience/:id', profileController.deleteExperience);

// Education
router.post('/education', validateJoi(addEducationSchema, 'body'), profileController.addEducation);
router.put('/education/:id', validateJoi(addEducationSchema, 'body'), profileController.updateEducation);
router.delete('/education/:id', profileController.deleteEducation);

// Certificates
router.post('/certificates', validateJoi(addCertificateSchema, 'body'), profileController.addCertificate);
router.put('/certificates/:id', validateJoi(addCertificateSchema, 'body'), profileController.updateCertificate);
router.delete('/certificates/:id', profileController.deleteCertificate);

// Resume
router.post('/resume', uploadSingle('resume'), profileController.uploadResume);
router.delete('/resume', profileController.deleteResume);

module.exports = router;
