/**
 * Test Service - Business logic for candidate assessment
 */
const Test = require('../models/test.model');
const Candidate = require('../models/candidate.model');
const { mapStarRatingToDifficulty, normalizeDifficultyLevel, isNonTechnicalDifficulty } = require('../../../shared/utilities/difficultyMapper');
const { uploadToS3, isS3Configured } = require('../../../config/s3');
const { uploadFile } = require('../../../config/storage');
const ApiError = require('../../../shared/utils/ApiError');

/**
 * Get candidate's star rating for a skill (0-5)
 */
function getCandidateSkillRating(candidate, skillName) {
    if (!candidate?.skills || !skillName) return 0;
    const target = String(skillName).toLowerCase().trim();
    for (const s of candidate.skills) {
        const name = (s.skillId?.skill || s.skillId?.name || '').toLowerCase();
        if (name && name.includes(target)) {
            const r = s.rating ?? s.calculatedRating ?? 0;
            return Math.max(0, Math.min(5, Math.round(r)));
        }
    }
    return 0;
}

/**
 * Create or update test config
 */
async function createUpdateTest(candidateId, body) {
    const { typeOfTest, skillNeedToTest, conditionSkills, practiceMode } = body;
    const dataToUpdate = { candidateId };

    if (typeOfTest) dataToUpdate.typeOfTest = typeOfTest;
    if (typeof practiceMode === 'boolean') dataToUpdate.practiceMode = practiceMode;

    if (Array.isArray(skillNeedToTest) && skillNeedToTest.length > 0) {
        const normalized = skillNeedToTest.map((item) => ({
            skill: String(item?.skill || item?.name || item?.skillName || '').trim(),
            difficulty: String(item?.difficulty || '').trim()
        })).filter(s => s.skill);

        if (normalized.length > 0) {
            const candidate = await Candidate.findById(candidateId).populate('skills.skillId', 'skill name');
            if (candidate) {
                normalized.forEach(skillTest => {
                    const normDiff = normalizeDifficultyLevel(skillTest.difficulty);
                    if (!isNonTechnicalDifficulty(normDiff)) {
                        const starRating = getCandidateSkillRating(candidate, skillTest.skill);
                        skillTest.difficulty = mapStarRatingToDifficulty(starRating);
                    } else {
                        skillTest.difficulty = normDiff;
                    }
                });
            }
            dataToUpdate.skillNeedToTest = normalized;
        }
    }

    if (conditionSkills && typeof conditionSkills === 'object' && !Array.isArray(conditionSkills)) {
        const overallExperience = Number(conditionSkills.overallExperience ?? 0);
        const roleYouWant = String(conditionSkills.roleYouWant ?? '').trim();
        const ratingsSrc = Array.isArray(conditionSkills.skillsRating) ? conditionSkills.skillsRating : [];
        const skillsRating = ratingsSrc.map((item) => ({
            skill: String(item?.skill || item?.name || item?.skillName || '').trim(),
            experience: Number(item?.experience ?? 0),
            rating: Number(item?.rating ?? item?.calculatedRating ?? 0)
        })).filter(r => r.skill);
        dataToUpdate.conditionSkills = { overallExperience, roleYouWant, skillsRating };
    }

    const isPractice = practiceMode === true;

    if (!isPractice) {
        const existingCompleted = await Test.findOne({ candidateId, testLimit: true, practiceMode: { $ne: true } });
        if (existingCompleted) {
            return { alreadyCompleted: true, test: existingCompleted };
        }
    }

    const query = isPractice
        ? { candidateId, practiceMode: true }
        : { candidateId, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };

    const test = await Test.findOneAndUpdate(
        query,
        { ...dataToUpdate, testTakenDate: new Date() },
        { upsert: true, runValidators: true, new: true }
    );

    const candidate = await Candidate.findById(candidateId);
    if (candidate && !candidate.test.some(t => t.toString() === test._id.toString())) {
        candidate.test.push(test._id);
        await candidate.save();
    }

    return { alreadyCompleted: false, test };
}

/**
 * Get latest test plan for candidate
 */
async function getLatestTest(candidateId) {
    const test = await Test.findOne({ candidateId }).sort({ createdAt: -1 }).lean();
    return test;
}

/**
 * Store problem for active test
 */
async function storeProblem(candidateId, problem, timestamp, practiceMode) {
    const problemData = {
        totalEstimatedTime: problem?.totalEstimatedTime,
        problems: problem?.problems,
        timestamp: timestamp ? new Date(timestamp) : new Date()
    };
    const query = practiceMode === true
        ? { candidateId, practiceMode: true }
        : { candidateId, testLimit: false, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
    const updated = await Test.findOneAndUpdate(
        query,
        { $push: { problems: problemData } },
        { new: true, sort: { createdAt: -1 } }
    );
    if (!updated) throw ApiError.notFound('No active test found');
    return { test: updated, problemData };
}

/**
 * Get latest problem for active test
 */
async function getLatestProblem(candidateId, practiceMode) {
    const query = practiceMode === true
        ? { candidateId, practiceMode: true }
        : { candidateId, testLimit: false, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
    const doc = await Test.findOne(query, { problems: { $slice: -1 } }).sort({ createdAt: -1 });
    if (!doc) throw ApiError.notFound('No active test found');
    const latest = doc.problems && doc.problems.length ? doc.problems[doc.problems.length - 1] : null;
    return latest;
}

/**
 * Upload self-intro (JSON with s3Location or multipart with video files)
 */
async function uploadSelfIntro(candidateId, payload, practiceMode) {
    if (!practiceMode) {
        const existingCompleted = await Test.findOne({ candidateId, testLimit: true, practiceMode: { $ne: true } });
        if (existingCompleted) return { message: 'Candidate already completed the test' };
    }

    if (Array.isArray(payload) && payload.length === 2) {
        const mapped = payload.map((item) => ({
            question: item?.question || '',
            audioText: item?.audioText || '',
            videoFile: item?.s3Location || item?.location || item?.videoFile || ''
        }));
        const query = practiceMode === true
            ? { candidateId, practiceMode: true }
            : { candidateId, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
        await Test.findOneAndUpdate(query, { selfIntro: mapped }, { new: true, runValidators: true, upsert: true });
        return { message: 'SelfIntro metadata saved', count: mapped.length };
    }
    throw ApiError.badRequest('Exactly 2 selfIntro items required');
}

/**
 * Upload self-intro with video files (multipart)
 */
async function uploadSelfIntroWithFiles(candidateId, questions, files, practiceMode) {
    if (!practiceMode) {
        const existingCompleted = await Test.findOne({ candidateId, testLimit: true, practiceMode: { $ne: true } });
        if (existingCompleted) return { message: 'Candidate already completed the test' };
    }

    const result = [];
    const folder = `${candidateId}/selfIntro`;
    for (let i = 0; i < 2; i++) {
        let videoUrl = null;
        const videoArr = files[`video${i + 1}`];
        if (videoArr && videoArr.length > 0) {
            const video = videoArr[0];
            if (!video.mimetype.startsWith('video/')) {
                throw ApiError.badRequest(`File video${i + 1} must be a video file`);
            }
            if (isS3Configured('session')) {
                const ext = video.originalname?.split('.').pop() || 'mp4';
                const s3Key = `${folder}/video${i + 1}-${Date.now()}.${ext}`;
                const { location } = await uploadToS3(video.buffer, s3Key, video.mimetype, 'session');
                videoUrl = location;
            } else {
                const { secure_url } = await uploadFile(video.buffer, `skilltera/test/${folder}/video${i + 1}`, 'video', video.originalname);
                videoUrl = secure_url;
            }
        }
        if (videoUrl && questions[i]) {
            result.push({
                question: questions[i]?.question || '',
                audioText: questions[i]?.audioText || '',
                videoFile: videoUrl
            });
        }
    }
    if (result.length > 0) {
        const query = practiceMode === true
            ? { candidateId, practiceMode: true }
            : { candidateId, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
        await Test.findOneAndUpdate(query, { selfIntro: result }, { new: true, runValidators: true, upsert: true });
    }
    return { message: 'SelfIntro video updated successfully', count: result.length };
}

/**
 * Upload env scan metadata (JSON only)
 */
async function uploadEnvScan(candidateId, envScan, practiceMode) {
    if (!Array.isArray(envScan) || envScan.length === 0) {
        throw ApiError.badRequest('envScan[] is required');
    }
    const entries = envScan.map(item => ({
        label: String(item.label || 'pre'),
        videoFile: String(item.s3Location || item.location || ''),
        durationMs: Number(item.durationMs || 0),
        brightnessStats: item.brightnessStats || null,
        motionStats: item.motionStats || null,
        facePresence: item.facePresence || null,
        recordedAt: item.recordedAt ? new Date(item.recordedAt) : new Date()
    }));
    const query = practiceMode === true
        ? { candidateId, practiceMode: true }
        : { candidateId, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
    const updated = await Test.findOneAndUpdate(query, { $set: { envScan: entries } }, { new: true, upsert: true });
    return { message: 'Environment scan saved', count: entries.length, testId: updated?._id };
}

/**
 * Upload solution file
 */
async function uploadSolution(candidateId, file, problemTitle, practiceMode) {
    const key = `skilltera/test/${candidateId}/problems`;
    const { secure_url } = await uploadFile(file.buffer, `${key}/${problemTitle || 'solution'}`, 'raw', file.originalname);
    const query = practiceMode === true
        ? { candidateId, practiceMode: true }
        : { candidateId, testLimit: false, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
    const updated = await Test.findOneAndUpdate(query, { $push: { solutionFileUrls: secure_url } }, { new: true, sort: { createdAt: -1 } });
    if (!updated) throw ApiError.notFound('No active test found');
    return { message: 'Solution uploaded', url: secure_url };
}

/**
 * Upload evaluation result and mark test complete
 * For practice mode, does not set testLimit: true (does not affect testCompleted)
 */
async function uploadEvaluation(candidateId, evaluationData, practiceMode) {
    const query = practiceMode === true
        ? { candidateId, practiceMode: true }
        : { candidateId, testLimit: false, $or: [{ practiceMode: false }, { practiceMode: { $exists: false } }] };
    const activeTest = await Test.findOne(query).sort({ updatedAt: -1 });
    if (!activeTest) throw ApiError.notFound('No active test found');

    const setData = { ...evaluationData };
    if (!activeTest.practiceMode) setData.testLimit = true;

    const updated = await Test.findByIdAndUpdate(
        activeTest._id,
        { $set: setData },
        { new: true, runValidators: true }
    );
    return {
        message: 'Evaluation result uploaded successfully',
        test: updated,
        overallScore: evaluationData.overallScore ?? updated.overallScore
    };
}

/**
 * Store proctoring violation
 */
async function storeViolation(candidateId, violationData) {
    const existingTest = await Test.findOne({ candidateId }).sort({ createdAt: -1 });
    if (!existingTest) throw ApiError.notFound('No test found');
    const violation = {
        type: violationData.type,
        alert: violationData.alert,
        timestamp: violationData.timestamp || new Date(),
        metadata: violationData.metadata || {}
    };
    if (!existingTest.violation) existingTest.violation = [];
    if (!Array.isArray(existingTest.violation)) existingTest.violation = [existingTest.violation];
    existingTest.violation.push(violation);
    await existingTest.save();
    return {
        message: 'Violation stored successfully',
        testId: existingTest._id,
        violationCount: existingTest.violation.length,
        testCompleted: existingTest.testLimit
    };
}

/**
 * Check test completion status
 */
async function checkTestCompletion(candidateId) {
    const test = await Test.findOne({ candidateId, testLimit: true })
        .select('_id createdAt updatedAt typeOfTest finalScore overallScore rating').lean();
    const candidate = await Candidate.findById(candidateId).select('currentRank').lean();

    if (!test) {
        return {
            completed: false,
            canTakeTest: true,
            message: 'No completed test found'
        };
    }

    const score = test.overallScore ?? test.finalScore ?? 0;
    let cooldownDays, performanceLevel;
    if (score >= 90) { cooldownDays = 7; performanceLevel = 'excellent'; }
    else if (score >= 80) { cooldownDays = 14; performanceLevel = 'good'; }
    else if (score >= 70) { cooldownDays = 21; performanceLevel = 'satisfactory'; }
    else if (score >= 60) { cooldownDays = 30; performanceLevel = 'needs improvement'; }
    else { cooldownDays = 45; performanceLevel = 'poor'; }

    const cooldownEnd = new Date(test.updatedAt);
    cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);
    const now = new Date();
    const canTakeTest = now >= cooldownEnd;
    const daysRemaining = canTakeTest ? 0 : Math.ceil((cooldownEnd - now) / (1000 * 60 * 60 * 24));

    return {
        completed: true,
        canTakeTest,
        testId: test._id,
        completedAt: test.updatedAt,
        testType: test.typeOfTest,
        score: test.overallScore ?? test.finalScore,
        overallScore: test.overallScore ?? test.finalScore,
        finalScore: test.overallScore ?? test.finalScore,
        rating: test.rating,
        performanceLevel,
        cooldownStatus: {
            canTakeTest,
            daysRemaining,
            cooldownDays,
            cooldownEndDate: cooldownEnd,
            nextAvailableDate: cooldownEnd
        }
    };
}

/**
 * Get stored test results for a completed assessment
 */
async function getTestResults(candidateId) {
    const test = await Test.findOne({
        candidateId, testLimit: true, practiceMode: { $ne: true }
    })
        .select('overallScore finalScore rating evaluations summary typeOfTest skillNeedToTest testTakenDate updatedAt')
        .sort({ updatedAt: -1 }).lean();
    if (!test) return null;
    return {
        overallScore: test.overallScore ?? test.finalScore ?? 0,
        rating: test.rating,
        evaluations: test.evaluations || [],
        summary: test.summary || {},
        testType: test.typeOfTest,
        skills: test.skillNeedToTest || [],
        completedAt: test.updatedAt || test.testTakenDate,
    };
}

module.exports = {
    createUpdateTest,
    getLatestTest,
    storeProblem,
    getLatestProblem,
    uploadSelfIntro,
    uploadSelfIntroWithFiles,
    uploadEnvScan,
    uploadSolution,
    uploadEvaluation,
    storeViolation,
    checkTestCompletion,
    getTestResults
};
