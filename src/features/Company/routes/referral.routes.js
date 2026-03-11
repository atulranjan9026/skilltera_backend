const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { authenticate, requireRole } = require('../../../shared/middleware/auth.middleware');
const referralController = require('../controllers/referral.controller');
const companyController = require('../controllers/company.controller');

const REFERRAL_ROLES = ['recruiter', 'company', 'company_admin', 'hiring_manager'];

const createReferralValidation = [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('candidateName').trim().isLength({ min: 3 }).withMessage('Candidate name must be at least 3 characters'),
  body('candidateEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('candidateLinkedInUrl').optional().trim(),
  body('connectionType').optional().trim(),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
];

router.use(authenticate);
router.use(requireRole(...REFERRAL_ROLES));

router.post('/referrals', createReferralValidation, referralController.createReferral);
router.get('/referrals', referralController.getRecruiterReferrals);
router.get('/referrals/stats', referralController.getRecruiterReferralStats);
router.get('/candidates/search', referralController.searchCandidates);
router.get('/jobs/assigned', companyController.getRecruiterAssignedJobs);

module.exports = router;
