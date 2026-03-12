const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import middleware
const { authenticate, requireRole } = require('../../../shared/middleware/auth.middleware');

// Import controller
const jobController = require('../controllers/job.controller');

// Get all active skills for job creation
router.get('/profile/allActiveSkills', authenticate, requireRole('company'), jobController.getAllActiveSkills);

// Validation rules for job creation
const jobValidation = [
    // Basic Information
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Job title must be between 3 and 100 characters'),
    
    body('description')
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Job description must be between 10 and 5000 characters'),
    
    body('jobType')
        .optional()
        .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance'])
        .withMessage('Invalid job type'),
    
    body('experienceLevel')
        .isIn(['entry', 'mid', 'senior', 'lead', 'executive'])
        .withMessage('Invalid experience level'),
    
    body('minExperience')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Minimum experience must be between 0 and 50 years'),
    
    body('maxExperience')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Maximum experience must be between 0 and 50 years'),
    
    // Location
    body('location.city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City name must be between 2 and 50 characters'),
    
    body('location.state')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('State name must be between 2 and 50 characters'),
    
    body('location.country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Country name must be between 2 and 50 characters'),
    
    body('location.isRemote')
        .optional()
        .isBoolean()
        .withMessage('Remote status must be a boolean'),
    
    body('location.remoteType')
        .optional()
        .isIn(['fully-remote', 'hybrid', 'on-site'])
        .withMessage('Invalid remote type'),
    
    // Salary
    body('salary.min')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum salary must be a positive number'),
    
    body('salary.max')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum salary must be a positive number'),
    
    body('salary.currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be a 3-letter code'),
    
    body('salary.period')
        .optional()
        .isIn(['hourly', 'monthly', 'yearly'])
        .withMessage('Invalid salary period'),
    
    // Application Details
    body('applicationDeadline')
        .optional()
        .isISO8601()
        .withMessage('Application deadline must be a valid date'),
    
    body('openings')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Number of openings must be between 1 and 1000'),
    
    // Arrays
    body('benefits')
        .optional()
        .isArray()
        .withMessage('Benefits must be an array'),
    
    body('responsibilities')
        .optional()
        .isArray()
        .withMessage('Responsibilities must be an array'),
    
    body('qualifications')
        .optional()
        .isArray()
        .withMessage('Qualifications must be an array'),
    
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    
    body('category')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2 and 50 characters'),
    
    // Skills
    body('requiredSkills')
        .optional()
        .isArray()
        .withMessage('Required skills must be an array'),
    
    // Enterprise Assignment
    body('enterpriseAssignment.lobId')
        .optional()
        .isMongoId()
        .withMessage('Invalid LOB ID'),
    
    body('enterpriseAssignment.hiringManagerId')
        .optional()
        .isMongoId()
        .withMessage('Invalid Hiring Manager ID'),
    
    body('enterpriseAssignment.backupHiringManagerId')
        .optional()
        .isMongoId()
        .withMessage('Invalid Backup Hiring Manager ID'),
    
    body('enterpriseAssignment.recruiterIds')
        .optional()
        .isArray()
        .withMessage('Recruiter IDs must be an array'),

    body('enterpriseAssignment.recruiterIds.*')
        .optional()
        .isMongoId()
        .withMessage('Invalid Recruiter ID'),
    
    // Custom validation for salary range
    body('salary.max').custom((value, { req }) => {
        if (value && req.body.salary.min && value < req.body.salary.min) {
            throw new Error('Maximum salary must be greater than minimum salary');
        }
        return true;
    }),
    
    // Custom validation for experience range
    body('maxExperience').custom((value, { req }) => {
        if (value !== undefined && req.body.minExperience !== undefined && value < req.body.minExperience) {
            throw new Error('Maximum experience must be greater than or equal to minimum experience');
        }
        return true;
    })
];

// Validation rules for job updates (all fields optional)
const jobUpdateValidation = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Job title must be between 3 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Job description must be between 10 and 5000 characters'),

    body('jobType')
        .optional()
        .isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance', 'Fulltime', 'Part Time', 'Contract', 'Internship', 'Freelance'])
        .withMessage('Invalid job type'),

    body('experienceLevel')
        .optional()
        .isIn(['entry', 'mid', 'senior', 'lead', 'executive'])
        .withMessage('Invalid experience level'),

    body('minExperience')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Minimum experience must be between 0 and 50 years'),

    body('maxExperience')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Maximum experience must be between 0 and 50 years'),

    body('location.city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City name must be between 2 and 50 characters'),

    body('location.country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Country name must be between 2 and 50 characters'),

    body('location.isRemote')
        .optional()
        .isBoolean()
        .withMessage('Remote status must be a boolean'),

    body('location.remoteType')
        .optional()
        .isIn(['fully-remote', 'hybrid', 'on-site'])
        .withMessage('Invalid remote type'),

    body('salary.min')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum salary must be a positive number'),

    body('salary.max')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum salary must be a positive number'),

    body('salary.currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be a 3-letter code'),

    body('salary.period')
        .optional()
        .isIn(['hourly', 'monthly', 'yearly'])
        .withMessage('Invalid salary period'),

    body('applicationDeadline')
        .optional()
        .isISO8601()
        .withMessage('Application deadline must be a valid date'),

    body('openings')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Number of openings must be between 1 and 1000'),

    body('benefits')
        .optional()
        .isArray()
        .withMessage('Benefits must be an array'),

    body('responsibilities')
        .optional()
        .isArray()
        .withMessage('Responsibilities must be an array'),

    body('qualifications')
        .optional()
        .isArray()
        .withMessage('Qualifications must be an array'),

    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),

    body('category')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2 and 50 characters'),

    // Enterprise Assignment
    body('enterpriseAssignment.lobId')
        .optional()
        .isMongoId()
        .withMessage('Invalid LOB ID'),
    
    body('enterpriseAssignment.hiringManagerId')
        .optional()
        .isMongoId()
        .withMessage('Invalid Hiring Manager ID'),
    
    body('enterpriseAssignment.backupHiringManagerId')
        .optional()
        .isMongoId()
        .withMessage('Invalid Backup Hiring Manager ID'),
    
    body('enterpriseAssignment.recruiterIds')
        .optional()
        .isArray()
        .withMessage('Recruiter IDs must be an array'),

    body('enterpriseAssignment.recruiterIds.*')
        .optional()
        .isMongoId()
        .withMessage('Invalid Recruiter ID'),

    // Custom validation for salary range
    body('salary.max').custom((value, { req }) => {
        if (value && req.body.salary.min && value < req.body.salary.min) {
            throw new Error('Maximum salary must be greater than minimum salary');
        }
        return true;
    }),

    // Custom validation for experience range
    body('maxExperience').custom((value, { req }) => {
        if (value !== undefined && req.body.minExperience !== undefined && value < req.body.minExperience) {
            throw new Error('Maximum experience must be greater than or equal to minimum experience');
        }
        return true;
    })
];

// Routes
router.post('/:companyId/jobs', authenticate, requireRole('company'), jobValidation, jobController.createJob);
router.get('/:companyId/jobs', authenticate, requireRole('company'), jobController.getCompanyJobs);
router.get('/jobs/stats', authenticate, requireRole('company'), jobController.getJobStats);
router.get('/:companyId/jobs/:id', authenticate, requireRole('company'), jobController.getJobById);
router.put('/:companyId/jobs/:id', authenticate, requireRole('company'), jobUpdateValidation, jobController.updateJob);
router.delete('/:companyId/jobs/:id', authenticate, requireRole('company'), jobController.deleteJob);
router.patch('/:companyId/jobs/:id/toggle-status', authenticate, requireRole('company'), jobController.toggleJobStatus);

module.exports = router;
