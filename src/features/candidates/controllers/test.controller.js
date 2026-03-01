/**
 * Test Controller - Assessment endpoints
 * Maps req.userId to candidateId for all handlers
 */
const asyncHandler = require('../../../shared/utils/asyncHandler');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');
const aiEvaluatorController = require('./aiEvaluator.controller');
const testService = require('../services/test.service');

/**
 * PATCH / - Create or update test config
 */
exports.createUpdateTest = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const result = await testService.createUpdateTest(candidateId, req.body);
    if (result.alreadyCompleted) {
        const response = new ApiResponse(HTTP_STATUS.OK, result.test, 'Candidate already given the test');
        return response.send(res);
    }
    const response = new ApiResponse(HTTP_STATUS.OK, result.test, 'Successfully added test');
    response.send(res);
});

/**
 * GET /latest - Get latest test plan for candidate
 */
exports.getTestPlan = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const test = await testService.getLatestTest(candidateId);
    const response = new ApiResponse(HTTP_STATUS.OK, test || {}, test ? 'Test plan fetched' : 'No test found');
    response.send(res);
});

/**
 * POST /get-prompt - Delegate to AI evaluator
 */
exports.getPrompt = asyncHandler(async (req, res, next) => {
    return aiEvaluatorController.getPrompt(req, res, next);
});

/**
 * POST /store-problem - Store generated problem
 */
exports.storeProblem = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const { problem, timestamp, practiceMode } = req.body;
    if (!problem) throw new Error('Problem data is required');
    const result = await testService.storeProblem(candidateId, problem, timestamp, practiceMode);
    const response = new ApiResponse(HTTP_STATUS.CREATED, {
        testId: result.test._id,
        problem: result.problemData,
        problemCount: result.test.problems.length
    }, 'Problem stored successfully');
    response.send(res);
});

/**
 * GET /get-problem - Get stored problem
 */
exports.getProblem = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const practiceMode = req.query.practiceMode === 'true' || req.body?.practiceMode === true;
    const problem = await testService.getLatestProblem(candidateId, practiceMode);
    const response = new ApiResponse(HTTP_STATUS.OK, { problem }, 'Problem fetched');
    response.send(res);
});

/**
 * PATCH /upload-selfintro - JSON or multipart
 */
exports.uploadSelfIntro = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const practiceMode = req.body?.practiceMode === true;
    if (req.body && Array.isArray(req.body.selfIntro)) {
        const result = await testService.uploadSelfIntro(candidateId, req.body.selfIntro, practiceMode);
        const response = new ApiResponse(HTTP_STATUS.OK, result, result.message);
        return response.send(res);
    }
    let questions;
    try {
        questions = typeof req.body.questions === 'string' ? JSON.parse(req.body.questions) : req.body.questions;
    } catch {
        throw new Error('Invalid questions format');
    }
    if (!Array.isArray(questions) || questions.length !== 2) {
        throw new Error('Exactly 2 questions are required');
    }
    const result = await testService.uploadSelfIntroWithFiles(candidateId, questions, req.files || {}, practiceMode);
    const response = new ApiResponse(HTTP_STATUS.OK, result, result.message);
    response.send(res);
});

/**
 * POST /upload-solution - File upload
 */
exports.uploadSolution = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const file = req.file || (Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null);
    if (!file) throw new Error('File is required');
    const problemTitle = req.body?.problemTitle || req.body?.problem || 'solution';
    const practiceMode = req.body?.practiceMode === true;
    const result = await testService.uploadSolution(candidateId, file, problemTitle, practiceMode);
    const response = new ApiResponse(HTTP_STATUS.OK, result, result.message);
    response.send(res);
});

/**
 * POST /upload-evaluation - JSON
 */
exports.uploadEvaluation = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const practiceMode = req.body?.practiceMode === true;
    const { practiceMode: _, ...evaluationData } = req.body;
    const result = await testService.uploadEvaluation(candidateId, evaluationData, practiceMode);
    const response = new ApiResponse(HTTP_STATUS.OK, result, result.message);
    response.send(res);
});

/**
 * PATCH /upload-envscan - JSON
 */
exports.uploadEnvScan = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const { envScan, practiceMode } = req.body || {};
    const result = await testService.uploadEnvScan(candidateId, envScan, practiceMode);
    const response = new ApiResponse(HTTP_STATUS.OK, result, result.message);
    response.send(res);
});

/**
 * POST /alert - Store proctoring violation
 */
exports.storeViolation = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const { violationData } = req.body;
    if (!violationData || !violationData.type || !violationData.alert) {
        throw new Error('Violation data with type and alert is required');
    }
    const result = await testService.storeViolation(candidateId, violationData);
    const response = new ApiResponse(HTTP_STATUS.CREATED, result, result.message);
    response.send(res);
});

/**
 * GET /results - Get stored test results
 */
exports.getTestResults = asyncHandler(async (req, res) => {
    const candidateId = req.userId;
    const result = await testService.getTestResults(candidateId);
    const response = new ApiResponse(HTTP_STATUS.OK, result || {}, result ? 'Test results fetched' : 'No test results found');
    response.send(res);
});

/**
 * GET /completion/:candidateId - Check test completion
 * Candidates can only check their own (candidateId must match req.userId or be 'me')
 */
exports.checkTestCompletion = asyncHandler(async (req, res) => {
    let candidateId = req.params.candidateId;
    if (candidateId === 'me' || !candidateId) {
        candidateId = req.userId;
    }
    const userIdStr = String(req.userId);
    if (String(candidateId) !== userIdStr) {
        throw new Error('You can only view your own test completion status');
    }
    const result = await testService.checkTestCompletion(candidateId);
    const response = new ApiResponse(HTTP_STATUS.OK, result, 'Completion status fetched');
    response.send(res);
});
