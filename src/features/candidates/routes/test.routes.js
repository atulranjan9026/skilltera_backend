/**
 * Test Routes - Assessment endpoints
 * Base path: /api/v1/candidates/test
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../shared/middleware/auth.middleware');
const {
    uploadVideoFields,
    uploadVideoAny,
    uploadVideoSingle,
} = require('../../../shared/middleware/upload.middleware');

const testController = require('../controllers/test.controller');
const sessionUploadController = require('../controllers/sessionUpload.controller');

router.use(authenticate);

// Test config
router.patch('/', testController.createUpdateTest);
router.get('/latest', testController.getTestPlan);

// AI prompt (delegates to aiEvaluator)
router.post('/get-prompt', testController.getPrompt);

// Problem storage
router.post('/store-problem', testController.storeProblem);
router.get('/get-problem', testController.getProblem);

// Self intro - JSON or multipart (video1, video2)
const selfIntroFields = [
    { name: 'video1', maxCount: 1 },
    { name: 'video2', maxCount: 1 },
];
router.patch('/upload-selfintro', uploadVideoFields(selfIntroFields), testController.uploadSelfIntro);

// Solution file upload
router.post('/upload-solution', uploadVideoSingle('solution'), testController.uploadSolution);

// Evaluation (JSON)
router.post('/upload-evaluation', testController.uploadEvaluation);

// Env scan (JSON)
router.patch('/upload-envscan', testController.uploadEnvScan);

// Proctoring violation
router.post('/alert', testController.storeViolation);

// Stored test results
router.get('/results', testController.getTestResults);

// Completion check
router.get('/completion/:candidateId', testController.checkTestCompletion);

// Session upload (S3 multipart) - /api/v1/candidates/test/session-upload/*
router.post('/session-upload/initiate', sessionUploadController.initiate);
router.get('/session-upload/sign', sessionUploadController.sign);
router.get('/session-upload/parts', sessionUploadController.parts);
router.post('/session-upload/complete', sessionUploadController.complete);
router.post('/session-upload/abort', sessionUploadController.abort);

module.exports = router;
