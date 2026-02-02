const express = require('express');
const router = express.Router();

const jobController = require('../controllers/job.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

/**
 * Job Routes
 * Base path: /api/v1/candidate/job
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/candidate/job/ranking
 * @desc    Get ranked jobs based on candidate profile
 * @query   page, limit, location, jobType, experienceLevel, minSalary, maxSalary, isRemote
 */
router.get('/ranking', jobController.getRankingJobs);

/**
 * @route   GET /api/v1/candidate/job/suggestions
 * @desc    Autocomplete job titles/companies
 */
router.get('/suggestions', jobController.getJobSuggestions);


router.get('/location-suggestions', jobController.getLocationSuggestions);


module.exports = router;
