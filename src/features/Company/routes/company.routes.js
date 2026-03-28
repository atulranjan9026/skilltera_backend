const express = require('express');
const router = express.Router();

// ── Controllers ─────────────────────────────────────────────────
const { companySignup, companyLogin, getCompanyJobs, getCompanyApplications, updateApplicationStatus, getCandidateTestResults } = require('../controllers/company.controller');
const { viewAllCompany, viewAllCompanyList } = require('../controllers/companyManagementController');

// ── Middleware ─────────────────────────────────────────────────
const { authenticate, requireRole } = require('../../../shared/middleware/auth.middleware');


// ── Auth Routes ─────────────────────────────────────────────────

// @route  POST /api/v1/company/auth/signup
// @desc   Register a new company
// @access Public
router.post('/auth/signup', companySignup);
router.post('/signup', companySignup); // alias

// @route  POST /api/v1/company/auth/login
// @desc   Unified login for Company Admin, Hiring Manager, Interviewer
// @access Public
router.post('/auth/login', companyLogin);
router.post('/login', companyLogin); // alias

// ── Company Data Routes ──────────────────────────────────────────

// @route  GET /api/v1/company/all
// @desc   Get all companies with full details
// @access Private (Admin)
router.get('/all', viewAllCompany);

// @route  GET /api/v1/company/list
// @desc   Get all company names (public safe)
// @access Public
router.get('/list', viewAllCompanyList);

// ── Company Specific Routes ──────────────────────────────────────
// Apply authentication to company-specific routes
router.use('/:companyId', authenticate);

// @route  GET /api/v1/company/:companyId/jobs
// @desc   Get all jobs for a specific company
// @access Private (Company Admin/Hiring Manager)
router.get('/:companyId/jobs', requireRole('company', 'hiring_manager', 'backup_hiring_manager'), getCompanyJobs);


// @route  GET /api/v1/company/:companyId/applications
// @desc   Get all applications for company's jobs
// @access Private (Company Admin/Hiring Manager)
router.get('/:companyId/applications', requireRole('company', 'hiring_manager', 'backup_hiring_manager'), getCompanyApplications);


// @route  PUT /api/v1/company/:companyId/applications/:applicationId
// @desc   Update application status
// @access Private (Company Admin/Hiring Manager)
router.put('/:companyId/applications/:applicationId', requireRole('company', 'hiring_manager', 'backup_hiring_manager'), updateApplicationStatus);

// @route  GET /api/v1/company/:companyId/test-results/:candidateId
// @desc   Get skill assessment test results for a candidate
// @access Private (Company Admin/Hiring Manager)
router.get('/:companyId/test-results/:candidateId', requireRole('company', 'hiring_manager', 'backup_hiring_manager'), getCandidateTestResults);

module.exports = router;