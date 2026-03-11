const express = require('express');
const { body } = require('express-validator');
const { requireCompanyAuth, requireCompanyAdmin } = require('../../../shared/middleware/companyAuth.middleware');
const enterpriseController = require('../controllers/enterprise.controller');

const router = express.Router();

// Enterprise routes require company admin (client admin)
router.use(requireCompanyAuth);
router.use(requireCompanyAdmin);

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

router.get('/lobs', enterpriseController.getAllLOBs);
router.post('/lobs', lobValidation, enterpriseController.createLOB);
router.put('/lobs/:id', lobValidation, enterpriseController.updateLOB);
router.delete('/lobs/:id', enterpriseController.deleteLOB);
router.post('/lobs/bulk', bulkLOBValidation, enterpriseController.bulkCreateLOBs);

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

router.get('/hiring-managers', enterpriseController.getAllHiringManagers);
router.post('/hiring-managers', hiringManagerValidation, enterpriseController.createHiringManager);
router.put('/hiring-managers/:id', hiringManagerValidation, enterpriseController.updateHiringManager);
router.delete('/hiring-managers/:id', enterpriseController.deleteHiringManager);
router.post('/hiring-managers/bulk', bulkHiringManagerValidation, enterpriseController.bulkCreateHiringManagers);

// ─── Interviewer Routes ────────────────────────────────────────────────────────

const interviewerValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const bulkInterviewerValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('items.*.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

router.get('/interviewers', enterpriseController.getAllInterviewers);
router.post('/interviewers', interviewerValidation, enterpriseController.createInterviewer);
router.put('/interviewers/:id', interviewerValidation, enterpriseController.updateInterviewer);
router.delete('/interviewers/:id', enterpriseController.deleteInterviewer);
router.post('/interviewers/bulk', bulkInterviewerValidation, enterpriseController.bulkCreateInterviewers);

// ─── Backup Hiring Manager Routes ───────────────────────────────────────────────

// Validation rules for Backup Hiring Manager
const backupHiringManagerValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('hiringManagerId').optional().isMongoId().withMessage('Invalid hiring manager ID')
];

router.get('/backup-hiring-managers', enterpriseController.getAllBackupHiringManagers);
router.post('/backup-hiring-managers', backupHiringManagerValidation, enterpriseController.createBackupHiringManager);
router.put('/backup-hiring-managers/:id', backupHiringManagerValidation, enterpriseController.updateBackupHiringManager);
router.delete('/backup-hiring-managers/:id', enterpriseController.deleteBackupHiringManager);

// ─── Recruiter Routes ───────────────────────────────────────────────────────────

// Validation rules for Recruiter
const recruiterValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('keySkills').optional().custom((val) => {
    if (val === undefined || val === null || val === '') return true;
    return Array.isArray(val) || typeof val === 'string';
  }).withMessage('Key skills can be array or comma-separated string')
];

const bulkRecruiterValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('items.*.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('items.*.keySkills').optional().isString().withMessage('Key skills must be a string')
];

router.get('/recruiters', enterpriseController.getAllRecruiters);
router.post('/recruiters', recruiterValidation, enterpriseController.createRecruiter);
router.put('/recruiters/:id', recruiterValidation, enterpriseController.updateRecruiter);
router.delete('/recruiters/:id', enterpriseController.deleteRecruiter);
router.post('/recruiters/bulk', bulkRecruiterValidation, enterpriseController.bulkCreateRecruiters);

module.exports = router;
