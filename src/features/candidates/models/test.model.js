const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    type: { type: String },
    alert: { type: String },
    timestamp: { type: Date },
    metadata: { type: Object }
}, { _id: false });

const ProblemSchema = new mongoose.Schema({
    totalEstimatedTime: { type: Number },
    problems: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date },
}, { _id: false, versionKey: false });

const NonTechnicalProblemSchema = new mongoose.Schema({
    id: Number,
    title: String,
    skill: String,
    difficulty: String,
    estimatedSolveTime: Number,
    questionType: {
        type: String,
        enum: ['scenario', 'multiple_choice', 'practical_task', 'case_study']
    },
    description: String,
    scenario: String,
    requirements: [String],
    expectedDeliverables: [String],
    evaluation_criteria: [String],
    sample_answer: String,
    hints: [String],
    relatedConcepts: [String],
    options: [String],
    answer: String,
    timeSpent: Number
}, { _id: false, versionKey: false });

const skillRatingSchema = new mongoose.Schema({
    skill: { type: String, required: true },
    experience: { type: Number, default: 0, required: true },
    rating: { type: Number, default: 0.0 },
}, { _id: false });

const conditionSkillsSchema = new mongoose.Schema({
    overallExperience: { type: Number, default: 0, required: true },
    roleYouWant: { type: String, required: true },
    skillsRating: [skillRatingSchema]
}, { _id: false });

const testSchema = new mongoose.Schema({
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate'
    },
    testLimit: { type: Boolean, default: false },
    practiceMode: { type: Boolean, default: false },
    typeOfTest: {
        type: String,
        enum: ['technical', 'non-technical', 'Technical', 'Non-Technical']
    },
    skillNeedToTest: [{
        skill: { type: String, required: true },
        difficulty: {
            type: String,
            enum: [
                'level1', 'level2', 'level3', 'level4', 'level5',
                'easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard',
                'beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced'
            ],
            required: true
        },
    }],
    conditionSkills: conditionSkillsSchema,
    selfIntro: [{
        question: String,
        audioText: String,
        videoFile: String,
    }],
    envScan: [{
        label: String,
        videoFile: String,
        durationMs: Number,
        brightnessStats: mongoose.Schema.Types.Mixed,
        motionStats: mongoose.Schema.Types.Mixed,
        facePresence: mongoose.Schema.Types.Mixed,
        recordedAt: Date,
    }],
    problems: [ProblemSchema],
    nonTechnicalProblems: [NonTechnicalProblemSchema],
    finalScore: Number,
    overallScore: Number,
    rating: String,
    techAnalysis: {
        total_penalty: Number,
        mismatch_details: [{
            problem: String,
            expected: String,
            submitted: String,
            severity: String
        }]
    },
    evaluations: [{
        problem: mongoose.Schema.Types.Mixed,
        solution: mongoose.Schema.Types.Mixed,
        evaluation: mongoose.Schema.Types.Mixed
    }],
    solutionFileUrls: [String],
    summary: {
        passedCount: Number,
        totalPenalty: Number,
        criticalMismatches: Number,
        recommendations: [String]
    },
    violation: [violationSchema],
    testTakenDate: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

const Test = mongoose.model('Test', testSchema);
module.exports = Test;
