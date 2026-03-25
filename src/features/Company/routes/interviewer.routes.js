const express = require('express');
const router = express.Router();
const interviewerController = require('../controllers/interviewer.controller');
const { authenticate, requireRole } = require('../../../shared/middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// ─── Company / Hiring Manager Routes ─────────────────────────────────────────

// Interviewer management
router.post(
    '/interviewers',
    requireRole('company', 'hiring_manager', 'backup_hiring_manager'),
    interviewerController.createInterviewer
);


router.post(
    '/interviewers/bulk',
    requireRole('company', 'hiring_manager', 'backup_hiring_manager'),
    interviewerController.bulkCreateInterviewers
);


router.get(
    '/interviewers',
    requireRole('company', 'hiring_manager', 'backup_hiring_manager'),
    interviewerController.getInterviewers
);


router.put(
    '/interviewers/:id',
    requireRole('company', 'hiring_manager', 'backup_hiring_manager'),
    interviewerController.updateInterviewer
);


router.delete(
    '/interviewers/:id',
    requireRole('company', 'hiring_manager', 'backup_hiring_manager'),
    interviewerController.deleteInterviewer
);


// Assignment
router.post(
    '/interviewers/assign',
    requireRole('company', 'hiring_manager', 'backup_hiring_manager'),
    interviewerController.assignInterviewers
);


// ─── Interviewer-Only Routes ──────────────────────────────────────────────────

router.get(
    '/interviewer/assigned-candidates',
    requireRole('interviewer'),
    interviewerController.getAssignedCandidates
);

router.post(
    '/interviewer/feedback',
    requireRole('interviewer'),
    interviewerController.submitFeedback
);

// This one is accessible by interviewer (for their own) or HM (for review)
router.get(
    '/interviewer/feedback/:applicationId',
    requireRole('interviewer', 'company', 'hiring_manager'),
    interviewerController.getFeedbackForApplication
);

module.exports = router;
