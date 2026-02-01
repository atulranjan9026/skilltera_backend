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
 * @route   GET /api/v1/candidate/job/search
 * @desc    Search jobs by text query
 * @query   q (search query), page, limit
 */
router.get('/search', jobController.searchJobs);

/**
 * @route   GET /api/v1/candidate/job/:jobId
 * @desc    Get job details by ID
 */
router.get('/:jobId', jobController.getJobById);

module.exports = router;
