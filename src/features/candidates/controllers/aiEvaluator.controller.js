/**
 * AI Evaluator Controller
 * Ported from skilltera-api - handles generateProblem, generateTestPlan, evaluateCode, evaluateNonTechnicalCode
 */
const OpenAI = require('openai');
const { generateBatchQuestionPrompt, getSystemMessage } = require('../../../prompts/technicalQuestionPrompts');
const { isNonTechnicalDifficulty } = require('../../../shared/utilities/difficultyMapper');

const modelVersion = 'deepseek-coder';

let client = null;
try {
    if (process.env.DEEPSEEK_API_KEY) {
        client = new OpenAI({
            baseURL: 'https://api.deepseek.com/v1',
            apiKey: process.env.DEEPSEEK_API_KEY,
            timeout: 120000
        });
        console.log('[ai-evaluator] DeepSeek client initialized');
    } else {
        console.warn('[ai-evaluator] DEEPSEEK_API_KEY not found');
    }
} catch (err) {
    console.error('[ai-evaluator] OpenAI init failed:', err.message);
}

const determineTestType = (skillsRating) => {
    const technicalKeywords = [
        'programming', 'coding', 'javascript', 'python', 'java', 'react', 'angular', 'vue',
        'node', 'sql', 'database', 'algorithm', 'data science', 'machine learning', 'ai',
        'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript',
        'html', 'css', 'bootstrap', 'jquery', 'express', 'django', 'flask', 'spring',
        'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'docker', 'kubernetes',
        'aws', 'azure', 'gcp', 'git', 'github', 'gitlab', 'jenkins', 'ci/cd',
        'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'matplotlib',
        'blockchain', 'solidity', 'web3', 'ethereum', 'bitcoin'
    ];
    let technicalCount = 0;
    let nonTechnicalCount = 0;
    skillsRating.forEach(skill => {
        const name = (skill.skill || '').toLowerCase();
        if (technicalKeywords.some(k => name.includes(k))) technicalCount++;
        else nonTechnicalCount++;
    });
    return nonTechnicalCount > technicalCount ? 'Non-Technical' : 'Technical';
};

const generateLegacyProblemPrompt = (config) => {
    const uniquePairs = [];
    config.recommendedSkills.forEach(skill => {
        const key = `${(skill.programmingLanguage || '').toLowerCase()}-${(skill.difficulty || '').toLowerCase()}`;
        if (!uniquePairs.find(item => item.key === key)) {
            uniquePairs.push({
                key,
                programmingLanguage: skill.programmingLanguage,
                difficulty: skill.difficulty
            });
        }
    });
    const combinationsSection = uniquePairs.map(c => `- ${c.programmingLanguage} (${c.difficulty})`).join('\n');
    return `You are an expert programming problem generator.

For each programming language and difficulty combination below, generate EXACTLY 1 problem in STRICT JSON. No frameworks or third-party libraries.

Return a single JSON object:
{
  "totalEstimatedTime": total_minutes,
  "problems": [
    {
      "id": 1,
      "title": "Problem Title",
      "language": "Programming language",
      "difficulty": "level1/level2/level3/level4/level5",
      "estimatedSolveTime": minutes,
      "description": "Clear problem statement",
      "requirements": ["req1", "req2"],
      "targetSkills": ["language"],
      "input_format": "Input format",
      "output_format": "Output format",
      "constraints": ["constraint1"],
      "test_cases": [{"input": "...", "output": "...", "explanation": "..."}],
      "evaluation_criteria": ["criteria1"],
      "hints": ["hint1"],
      "relatedConcepts": ["concept1"]
    }
  ]
}

Combinations:
${combinationsSection}

Create VARIATIONS of LeetCode problems, not exact copies. Return ONLY valid JSON.`;
};

const generateProblemPrompt = (config) => {
    if (!config.recommendedSkills || !Array.isArray(config.recommendedSkills)) {
        throw new Error('Missing required configuration: recommendedSkills');
    }
    const skillDifficultyPairs = config.recommendedSkills
        .filter(skill => !isNonTechnicalDifficulty(skill.difficulty || ''))
        .map(skill => ({
            skill: skill.programmingLanguage || skill.skill || 'JavaScript',
            difficulty: skill.difficulty || 'level3'
        }));
    if (skillDifficultyPairs.length === 0) {
        return generateLegacyProblemPrompt(config);
    }
    try {
        return generateBatchQuestionPrompt(skillDifficultyPairs);
    } catch (err) {
        console.error('[ai-evaluator] Enhanced prompt failed, using legacy:', err);
        return generateLegacyProblemPrompt(config);
    }
};

const generateNonTechnicalProblemPrompt = (config) => {
    if (!config.recommendedSkills || !Array.isArray(config.recommendedSkills)) {
        throw new Error('Missing required configuration: recommendedSkills');
    }
    const skillsSection = config.recommendedSkills.map(s => `- ${s.skill} (${s.difficulty})`).join('\n');
    return `You are an expert non-technical assessment designer.

For each skill below, generate EXACTLY 1 unique question in STRICT JSON format.

Return a single JSON object:
{
  "totalEstimatedTime": total_minutes,
  "problems": [
    {
      "id": 1,
      "title": "Question Title",
      "skill": "Skill Name",
      "difficulty": "Beginner/Easy/Medium/Hard/Expert",
      "estimatedSolveTime": minutes,
      "questionType": "scenario|multiple_choice|practical_task|case_study",
      "description": "Clear question",
      "scenario": "Detailed scenario",
      "requirements": ["req1"],
      "expectedDeliverables": ["deliverable1"],
      "evaluation_criteria": ["criteria1"],
      "sample_answer": "Example response",
      "hints": ["hint1"],
      "relatedConcepts": ["concept1"]
    }
  ]
}

Skills:
${skillsSection}

Candidate: ${config.overallExperience} years exp, target role: ${config.roleYouWant}
Return ONLY valid JSON.`;
};

const generateFallbackQuestions = (recommendedSkills) => ({
    totalEstimatedTime: recommendedSkills.length * 15,
    problems: recommendedSkills.map((skill, i) => ({
        id: i + 1,
        title: `General ${skill.skill} Question`,
        skill: skill.skill,
        difficulty: skill.difficulty,
        estimatedSolveTime: 15,
        questionType: 'scenario',
        description: `Describe your experience with ${skill.skill} and provide an example.`,
        scenario: `Professional environment where ${skill.skill} is essential.`,
        requirements: ['Provide specific examples', 'Explain impact', 'Demonstrate understanding'],
        expectedDeliverables: ['Written response (200-300 words)'],
        evaluation_criteria: ['Relevance', 'Depth', 'Practical application', 'Communication'],
        sample_answer: `I have used ${skill.skill} in my work to...`,
        hints: ['Think about specific projects', 'Focus on outcomes', 'Explain thought process'],
        relatedConcepts: [skill.skill]
    }))
});

const createCombinedPrompt = (data) => {
    let prompt = `**Comprehensive Evaluation Request**\n\n`;
    data.forEach((item, i) => {
        const { problem, solution } = item;
        const lang = problem.language || 'unspecified';
        prompt += `### Problem ${i + 1}: ${problem.title}\n`;
        prompt += `**Difficulty:** ${problem.difficulty}\n**Language:** ${lang}\n`;
        prompt += `**Solution:**\n\`\`\`${lang}\n${solution}\n\`\`\`\n`;
        prompt += `**Requirements:** ${(problem.requirements || []).join(' | ') || 'None'}\n`;
        prompt += `**Constraints:** ${(problem.constraints || []).join(' | ') || 'None'}\n`;
        if (problem.test_cases) {
            prompt += `**Test Cases:**\n${problem.test_cases.map(tc =>
                `- Input: ${tc.input} => Output: ${tc.output}${tc.explanation ? ` (${tc.explanation})` : ''}`
            ).join('\n')}\n`;
        }
        prompt += '\n';
    });
    prompt += `**EVALUATION FORMAT (JSON):**
{
  "overall_score": 0-100,
  "evaluations": [
    {
      "problem_id": 1,
      "base_score": 0-100,
      "tech_penalty": {"points": 0, "reason": "Tech penalties disabled"},
      "final_score": 0-100,
      "verdict": "PASS/FAIL",
      "feedback": "overall feedback",
      "correctness_analysis": "analysis",
      "quality_analysis": "code quality review",
      "evaluation_process": "step-by-step explanation",
      "improvement_suggestions": ["suggestion1", "suggestion2"]
    }
  ],
  "tech_analysis": {"total_penalty": 0, "mismatch_details": []},
  "recommendations": ["recommendation1"]
}`;
    return prompt;
};

const getProblemWeight = (difficulty) => {
    const { normalizeDifficultyLevel } = require('../../../shared/utilities/difficultyMapper');
    const n = normalizeDifficultyLevel(difficulty);
    const weights = {
        level1: 1.0, level2: 1.3, level3: 1.6, level4: 2.0, level5: 2.5,
        beginner: 1.0, intermediate: 1.5, advanced: 2.0
    };
    return weights[n] || 1.0;
};

const getOverallRating = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
};

const createFallbackResponse = (data, error) => ({
    overallScore: 0,
    rating: 'Error',
    techAnalysis: { total_penalty: 0, mismatch_details: [] },
    evaluations: data.map((item) => ({
        problem: item.problem,
        solution: item.solution,
        evaluation: {
            baseScore: 0,
            techPenalty: { points: 0, reason: 'Evaluation failed' },
            finalScore: 0,
            isPassing: false,
            feedback: `Evaluation failed: ${error.message}`,
            correctness_analysis: 'Could not evaluate',
            quality_analysis: 'Could not evaluate'
        }
    })),
    summary: {
        passedCount: 0,
        totalPenalty: 0,
        criticalMismatches: 0,
        recommendations: ['Please try again or contact support']
    }
});

const processCombinedResults = (data, completion) => {
    try {
        const result = JSON.parse(completion.choices[0].message.content);
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const evaluations = data.map((item, idx) => {
            const evalData = result.evaluations[idx] || {};
            const weight = getProblemWeight(item.problem.difficulty);
            const baseScore = evalData.base_score || 0;
            const finalScore = baseScore;
            totalWeightedScore += finalScore * weight;
            totalWeight += weight;
            return {
                problem: item.problem,
                solution: item.solution,
                evaluation: {
                    baseScore,
                    techPenalty: { points: 0, reason: 'Tech penalties disabled' },
                    finalScore,
                    isPassing: finalScore >= 70,
                    feedback: evalData.feedback || ''
                }
            };
        });
        const overallScore = Math.round(totalWeightedScore / totalWeight);
        return {
            overallScore,
            rating: getOverallRating(overallScore),
            techAnalysis: result.tech_analysis || {},
            evaluations,
            summary: {
                passedCount: evaluations.filter(e => e.evaluation.isPassing).length,
                totalPenalty: result.tech_analysis?.total_penalty || 0,
                criticalMismatches: (result.tech_analysis?.mismatch_details || []).filter(m => m.severity === 'CRITICAL').length,
                recommendations: ['Focus on requirements', 'Improve code quality', 'Practice similar problems']
            }
        };
    } catch (err) {
        return createFallbackResponse(data, new Error('Failed to process: ' + err.message));
    }
};

const evaluateNonTechnicalResponse = async (config) => {
    const prompt = `You are an expert non-technical assessment evaluator.

Evaluate the following candidate responses. For unanswered questions (response null), give 0 points and explain what was expected.

${JSON.stringify(config, null, 2)}

Respond in JSON:
{
  "overallScore": 0-100,
  "evaluations": [
    {
      "problemId": 1,
      "score": 0-100,
      "isAnswered": true/false,
      "breakdown": {"relevance": 0-25, "understanding": 0-25, "application": 0-25, "communication": 0-25},
      "feedback": "Detailed feedback",
      "strengths": [],
      "improvements": []
    }
  ],
  "summary": {
    "totalScore": 0-100,
    "rating": "Excellent/Good/Satisfactory/Needs Improvement",
    "keyStrengths": [],
    "developmentAreas": [],
    "recommendations": []
  }
}`;
    const completion = await client.chat.completions.create({
        messages: [
            { role: 'system', content: 'You are an expert non-technical assessment evaluator.' },
            { role: 'user', content: prompt }
        ],
        model: modelVersion,
        response_format: { type: 'json_object' },
        temperature: 0.1
    });
    return JSON.parse(completion.choices[0].message.content);
};

/**
 * Main getPrompt handler - delegates by flag
 */
const getPrompt = async (req, res) => {
    const { flag, config } = req.body;
    let testType = config?.testType;
    if (!testType && config?.skillsRating) {
        testType = determineTestType(config.skillsRating);
    }
    testType = testType || 'Technical';

    if (flag === 'generateProblem') {
        try {
            if (!config) return res.status(400).json({ msg: 'provide config for generation prompt' });
            if (!client) return res.status(503).json({ msg: 'API client not initialized' });

            const prompt = testType.toLowerCase() === 'non-technical'
                ? generateNonTechnicalProblemPrompt(config)
                : generateProblemPrompt(config);
            const systemMessage = testType.toLowerCase() === 'non-technical'
                ? 'You are an expert non-technical assessment designer.'
                : getSystemMessage();

            const completion = await client.chat.completions.create({
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                model: modelVersion,
                response_format: { type: 'json_object' },
                max_tokens: 8000,
                temperature: 0.3
            });

            const content = completion?.choices?.[0]?.message?.content;
            if (!content) return res.status(502).json({ msg: 'Invalid API response' });

            let response;
            try {
                response = JSON.parse(content);
            } catch (err) {
                return res.status(502).json({ msg: 'Invalid JSON in model response: ' + err.message });
            }

            if (!response.problems || !Array.isArray(response.problems) || response.problems.length === 0) {
                return res.status(502).json({ msg: 'No problems generated', response });
            }

            const requiredFields = testType.toLowerCase() === 'non-technical'
                ? ['id', 'title', 'skill', 'difficulty', 'questionType', 'description', 'scenario', 'requirements', 'expectedDeliverables', 'evaluation_criteria', 'sample_answer', 'hints', 'relatedConcepts']
                : ['id', 'title', 'language', 'difficulty', 'description', 'requirements', 'input_format', 'output_format', 'constraints', 'test_cases', 'evaluation_criteria', 'hints', 'relatedConcepts'];

            for (const problem of response.problems) {
                for (const field of requiredFields) {
                    if (!(field in problem)) {
                        return res.status(502).json({ msg: `Problem ${problem.id} missing field: ${field}` });
                    }
                }
                if (testType.toLowerCase() === 'technical') {
                    const forbidden = ['react', 'angular', 'django', 'spring', 'laravel', 'vue', 'flask'];
                    const text = JSON.stringify(problem).toLowerCase();
                    for (const fw of forbidden) {
                        if (text.includes(fw)) {
                            return res.status(502).json({ msg: `Problem ${problem.id} contains forbidden framework: ${fw}` });
                        }
                    }
                }
            }

            return res.status(200).json({ data: response });
        } catch (error) {
            if (testType.toLowerCase() === 'non-technical' && config?.recommendedSkills) {
                const fallback = generateFallbackQuestions(config.recommendedSkills);
                return res.status(200).json({ data: fallback });
            }
            return res.status(500).json({
                data: {
                    error: 'Problem generation failed',
                    details: error.message,
                    requirements: ['Ensure problems target core language only', 'No framework dependencies']
                }
            });
        }
    }

    if (flag === 'evaluateCode') {
        if (!Array.isArray(config)) return res.status(400).json({ msg: 'Input must be an array of problem-solution pairs' });
        if (!client) return res.status(503).json({ msg: 'API client not initialized' });
        const evaluationPrompt = createCombinedPrompt(config);
        try {
            const completion = await client.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `You are a senior code evaluator. Score each solution 0-100. Focus on algorithm quality, logic correctness, code structure. Do NOT penalize for function name mismatches or language choices. Evaluate based on: Does the code show good algorithmic thinking? Return JSON with overall_score, evaluations array, tech_analysis, recommendations.`
                    },
                    { role: 'user', content: evaluationPrompt }
                ],
                model: modelVersion,
                response_format: { type: 'json_object' },
                temperature: 0.1
            });
            const result = processCombinedResults(config, completion);
            return res.status(200).json({ data: result });
        } catch (error) {
            const result = createFallbackResponse(config, error);
            return res.status(502).json({ data: result });
        }
    }

    if (flag === 'evaluateNonTechnicalCode') {
        if (!Array.isArray(config)) return res.status(400).json({ msg: 'Input must be an array of problem-response pairs' });
        if (!client) return res.status(503).json({ msg: 'API client not initialized' });
        try {
            const result = await evaluateNonTechnicalResponse(config);
            return res.status(200).json({ data: result });
        } catch (error) {
            return res.status(500).json({ msg: error.message || 'Evaluation failed' });
        }
    }

    if (flag === 'generateTestPlan') {
        if (!config || !config.skillsRating || !Array.isArray(config.skillsRating) || !config.roleYouWant || typeof config.overallExperience !== 'number') {
            return res.status(400).json({ msg: 'Invalid test plan configuration' });
        }
        if (!client) return res.status(503).json({ msg: 'API client not initialized' });

        const prompt = `You are an expert assessment designer.

Using the candidate data, determine:
1. testType: "Technical" or "Non-Technical"
2. recommendedSkills: 3-4 skills from the provided skillsRating, with difficulty and programmingLanguage
3. Difficulty mapping: 0-0.99→Beginner, 1-1.99→Easy, 2-2.99→Medium, 3-3.99→Hard, 4-5→Expert
4. USE ONLY skills from the provided skillsRating - do NOT generate new skills

Respond in JSON:
{
  "testType": "Technical" or "Non-Technical",
  "recommendedSkills": [
    { "skill": "EXACT_SKILL_FROM_CANDIDATE", "difficulty": "Level", "programmingLanguage": "Language or \"\"" }
  ]
}

Candidate Data:
${JSON.stringify({ skillsRating: config.skillsRating, overallExperience: config.overallExperience, roleYouWant: config.roleYouWant }, null, 2)}

Available skills: ${config.skillsRating.map(s => s.skill).join(', ')}`;

        let lastError = null;
        for (let retries = 0; retries <= 2; retries++) {
            try {
                const completion = await client.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'Only recommend skills from the provided skillsRating array.' },
                        { role: 'user', content: prompt }
                    ],
                    model: modelVersion,
                    response_format: { type: 'json_object' },
                    temperature: 0.3
                });
                const result = completion?.choices?.[0]?.message?.content;
                if (!result) throw new Error('No content in response');
                const parsed = JSON.parse(result);
                if (!parsed.testType || !Array.isArray(parsed.recommendedSkills)) {
                    throw new Error('Missing testType or recommendedSkills');
                }
                const available = config.skillsRating.map(s => s.skill);
                const invalid = parsed.recommendedSkills.filter(s => !available.includes(s.skill)).map(s => s.skill);
                if (invalid.length) throw new Error(`Invalid skills: ${invalid.join(', ')}`);

                // Enforce minimum 3 recommended skills for coding assessments
                const minSkills = 3;
                if (parsed.recommendedSkills.length < minSkills && available.length >= minSkills) {
                    const usedSkills = new Set(parsed.recommendedSkills.map(s => s.skill));
                    for (const sr of config.skillsRating) {
                        if (parsed.recommendedSkills.length >= minSkills) break;
                        if (!usedSkills.has(sr.skill)) {
                            parsed.recommendedSkills.push({
                                skill: sr.skill,
                                difficulty: 'Medium',
                                programmingLanguage: sr.skill
                            });
                            usedSkills.add(sr.skill);
                        }
                    }
                }

                return res.status(200).json({ data: parsed });
            } catch (err) {
                lastError = err;
                if (retries < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
            }
        }
        return res.status(500).json({ msg: 'Failed to generate test plan', error: lastError?.message });
    }

    return res.status(400).json({ msg: 'Invalid flag' });
};

module.exports = {
    getPrompt,
    createCombinedPrompt,
    getProblemWeight,
    getOverallRating,
    createFallbackResponse,
    processCombinedResults,
    evaluateNonTechnicalResponse
};
