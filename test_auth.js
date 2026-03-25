const { requireRole } = require('E:/skillTeraData/backend/src/shared/middleware/auth.middleware.js');
const mongoose = require('mongoose');

// Mock request and response
const mockRes = {};
const mockNext = (...args) => {
    if (args.length > 0) {
        console.log('Next called with error:', args[0]);
    } else {
        console.log('Next called successfully (Allowed)');
    }
};

// Create dummy models to mimic Mongoose instances
class Companies {}
class Candidate {}
class HiringManagers {}
class BackupHiringManagers {}
class Interviewers {}

const testCase = async (testName, userRole, requiredRoles, userInstance) => {
    console.log(`\n--- Test: ${testName} ---`);
    const mockReq = { 
        userRole: userRole,
    };
    if (userInstance) {
        mockReq.user = userInstance;
    }

    try {
        const middleware = requireRole(...requiredRoles);
        // The middleware returns an async handler, need to extract inner function or just call it directly
        // asyncHandler usually wraps async functions. Since we mock next, we await it.
        // Actually requireRole returns asyncHandler(async(req, res, next) => ...), which is a function(req, res, next) { return Promise.resolve(fn(req,res,next)).catch(next); }
        await middleware(mockReq, mockRes, mockNext);
    } catch (e) {
        console.log('Error thrown directly:', e.message);
    }
};

const runTests = async () => {
    try {
        await testCase('Interviewer with token role accessing interviewer route', 'interviewer', ['interviewer'], new Interviewers());
        await testCase('Interviewer with NO token role accessing interviewer route', null, ['interviewer'], new Interviewers());
        await testCase('Company with NO token role accessing company route', null, ['company'], new Companies());
        await testCase('Candidate with NO token role accessing candidate route', null, ['candidate'], new Candidate());
        await testCase('Hiring manager with NO token role accessing hiring_manager route', null, ['hiring_manager'], new HiringManagers());
        await testCase('Backup manager with NO token role accessing backup route', null, ['backup_hiring_manager'], new BackupHiringManagers());
        await testCase('Interviewer attempting to access company route (Should fail)', null, ['company'], new Interviewers());
    } catch (e) {
        console.error(e);
    }
};

runTests();
