const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../../../shared/middleware/auth.middleware');
const enterpriseController = require('../controllers/enterprise.controller');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// NOTE: We don't use global requireRole('company') here because it would conflict 
// with other routers mounted at the same base path (like interviewer.routes.js)
// Instead, we apply it to specific route groups or routes.


// ─── LOB Routes ────────────────────────────────────────────────────────────────

// Validation rules for LOB
const lobValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('LOB name must be between 1 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
];

const bulkLOBValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').trim().isLength({ min: 1, max: 100 }).withMessage('LOB name must be between 1 and 100 characters'),
  body('items.*.description').optional().trim().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
];

router.get('/lobs', requireRole('company'), enterpriseController.getAllLOBs);
router.post('/lobs', requireRole('company'), lobValidation, enterpriseController.createLOB);
router.put('/lobs/:id', requireRole('company'), lobValidation, enterpriseController.updateLOB);
router.delete('/lobs/:id', requireRole('company'), enterpriseController.deleteLOB);
router.post('/lobs/bulk', requireRole('company'), bulkLOBValidation, enterpriseController.bulkCreateLOBs);

// ─── Hiring Manager Routes ─────────────────────────────────────────────────────

// Validation rules for Hiring Manager
const hiringManagerValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

const bulkHiringManagerValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('items.*.email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

router.get('/hiring-managers', requireRole('company'), enterpriseController.getAllHiringManagers);
router.post('/hiring-managers', requireRole('company'), hiringManagerValidation, enterpriseController.createHiringManager);
router.put('/hiring-managers/:id', requireRole('company'), hiringManagerValidation, enterpriseController.updateHiringManager);
router.delete('/hiring-managers/:id', requireRole('company'), enterpriseController.deleteHiringManager);
router.post('/hiring-managers/bulk', requireRole('company'), bulkHiringManagerValidation, enterpriseController.bulkCreateHiringManagers);

// ─── Backup Hiring Manager Routes ───────────────────────────────────────────────

// Validation rules for Backup Hiring Manager
const backupHiringManagerValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('hiringManagerId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid hiring manager ID')
];

router.get('/backup-hiring-managers', requireRole('company'), enterpriseController.getAllBackupHiringManagers);
router.post('/backup-hiring-managers', requireRole('company'), backupHiringManagerValidation, enterpriseController.createBackupHiringManager);
router.put('/backup-hiring-managers/:id', requireRole('company'), backupHiringManagerValidation, enterpriseController.updateBackupHiringManager);
router.delete('/backup-hiring-managers/:id', requireRole('company'), enterpriseController.deleteBackupHiringManager);

// ─── Recruiter Routes ───────────────────────────────────────────────────────────

// Validation rules for Recruiter
const recruiterValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('keySkills').optional().isArray().withMessage('Key skills must be an array')
];

const bulkRecruiterValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('items.*.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('items.*.keySkills').optional().isString().withMessage('Key skills must be a string')
];

router.get('/recruiters', requireRole('company'), enterpriseController.getAllRecruiters);
router.post('/recruiters', requireRole('company'), recruiterValidation, enterpriseController.createRecruiter);
router.put('/recruiters/:id', requireRole('company'), recruiterValidation, enterpriseController.updateRecruiter);
router.delete('/recruiters/:id', requireRole('company'), enterpriseController.deleteRecruiter);
router.post('/recruiters/bulk', requireRole('company'), bulkRecruiterValidation, enterpriseController.bulkCreateRecruiters);

module.exports = router;
