/**
 * Technical Question Prompt Templates
 * Comprehensive prompt generation for AI-based question creation
 * Incorporates LeetCode patterns and difficulty-specific requirements
 */

const { getPatternForSkill } = require('./leetcodePatterns');
const { getDifficultyMetadata } = require('../shared/utilities/difficultyMapper');

/**
 * Generates a comprehensive prompt for AI question generation
 *
 * @param {string} skill - Programming skill (e.g., 'JavaScript', 'Python')
 * @param {string} difficulty - Difficulty level (level1-level5)
 * @param {number} questionCount - Number of questions to generate
 * @returns {string} Complete prompt for AI
 */
function generateQuestionPrompt(skill, difficulty, questionCount = 1) {
  const patterns = getPatternForSkill(skill, difficulty);
  const metadata = getDifficultyMetadata(difficulty);

  if (!patterns || !metadata) {
    throw new Error(`No patterns found for skill: ${skill}, difficulty: ${difficulty}`);
  }

  const prompt = `You are an expert technical interviewer creating coding problems for ${skill} assessment.

DIFFICULTY LEVEL: ${metadata.label}
TARGET AUDIENCE: ${metadata.targetAudience}
ESTIMATED SOLVE TIME: ${metadata.estimatedTime}

PROBLEM PATTERNS TO USE:
${patterns.patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

LEETCODE REFERENCE PROBLEMS (for inspiration, create VARIATIONS):
${patterns.leetcodeReferences.map((ref, i) => `${i + 1}. ${ref}`).join('\n')}

COMPLEXITY REQUIREMENTS:
- Time Complexity: ${patterns.constraints.timeComplexity}
- Space Complexity: ${patterns.constraints.spaceComplexity}
- Input Size: ${patterns.constraints.inputSize}

REQUIRED CONCEPTS TO TEST:
${patterns.requiredConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

INSTRUCTIONS:
1. Generate ${questionCount} unique coding problem(s) that test the above patterns
2. Each problem MUST be a VARIATION of LeetCode-style problems, not exact copies
3. Create variations by:
   - Changing the problem context (e.g., use e-commerce instead of social media)
   - Modifying constraints slightly (different array sizes, value ranges)
   - Adjusting the problem statement while keeping core algorithm the same
   - Using different variable names and scenarios
4. Include diverse test cases (minimum 4-5 cases per problem)
5. Ensure problems are solvable within the estimated time: ${metadata.estimatedTime}
6. Match the difficulty precisely to ${metadata.label}

OUTPUT FORMAT (JSON):
Return a JSON object with the following structure:
{
  "totalEstimatedTime": <sum of all estimated solve times in minutes>,
  "problems": [
    {
      "id": <unique number starting from 1>,
      "title": "<Problem title>",
      "skill": "${skill}",
      "language": "${skill}",
      "difficulty": "${difficulty}",
      "estimatedSolveTime": <time in minutes>,
      "description": "<Clear problem description>",
      "requirements": ["<requirement 1>", "<requirement 2>", ...],
      "targetSkills": ["<skill 1>", "<skill 2>", ...],
      "input_format": "<Description of input format>",
      "output_format": "<Description of output format>",
      "constraints": ["<constraint 1>", "<constraint 2>", ...],
      "test_cases": [
        {
          "input": "<test input>",
          "output": "<expected output>",
          "explanation": "<why this output>"
        },
        ... (minimum 4-5 test cases including edge cases)
      ],
      "evaluation_criteria": [
        "Correctness: Solution passes all test cases",
        "Time Complexity: Achieves ${patterns.constraints.timeComplexity}",
        "Space Complexity: Within ${patterns.constraints.spaceComplexity}",
        "Code Quality: Clean, readable, well-structured",
        "Edge Case Handling: Properly handles edge cases"
      ],
      "hints": [
        "<hint 1 - subtle guidance>",
        "<hint 2 - intermediate help>",
        "<hint 3 - strong direction>"
      ],
      "relatedConcepts": ${JSON.stringify(patterns.requiredConcepts)}
    }
  ]
}

IMPORTANT VARIATION GUIDELINES:
- DO NOT copy LeetCode problems exactly
- Change the real-world scenario (shopping cart → library system, social network → gaming platform, etc.)
- Adjust numerical constraints (if LC problem uses n < 10^4, you might use n < 10^5)
- Modify the problem statement while preserving the algorithmic challenge
- Use different examples than the original LeetCode problem

Example of good variation:
- LeetCode #1 "Two Sum": Find indices of two numbers that add to target
- Your variation: "Product Pair" - In a product catalog, find two items whose prices sum to a budget limit

Generate ${questionCount} high-quality, LeetCode-inspired problem(s) now.`;

  return prompt;
}

/**
 * Generates a batch prompt for multiple skills and difficulties
 *
 * @param {array} skillDifficultyPairs - Array of {skill, difficulty} objects
 * @returns {string} Comprehensive batch prompt
 */
function generateBatchQuestionPrompt(skillDifficultyPairs) {
  const totalProblems = skillDifficultyPairs.length;

  const problemSpecifications = skillDifficultyPairs.map((pair, index) => {
    const { skill, difficulty } = pair;
    const patterns = getPatternForSkill(skill, difficulty);
    const metadata = getDifficultyMetadata(difficulty);

    if (!patterns || !metadata) {
      return `Problem ${index + 1}: [ERROR - No patterns for ${skill} at ${difficulty}]`;
    }

    return `
PROBLEM ${index + 1} SPECIFICATION:
- Skill: ${skill}
- Difficulty: ${difficulty} (${metadata.label})
- Patterns: ${patterns.patterns.join(', ')}
- Reference: ${patterns.leetcodeReferences[0]}
- Time Limit: ${metadata.estimatedTime}
- Complexity: ${patterns.constraints.timeComplexity}
- Concepts: ${patterns.requiredConcepts.slice(0, 3).join(', ')}`;
  }).join('\n');

  const prompt = `You are an expert technical interviewer creating a comprehensive coding assessment.

ASSESSMENT OVERVIEW:
- Total Problems: ${totalProblems}
- Assessment Type: Multi-skill technical evaluation
- Format: LeetCode-style coding challenges with variations

${problemSpecifications}

GLOBAL INSTRUCTIONS:
1. Generate ${totalProblems} unique problems, one for each specification above
2. Each problem must be a VARIATION of LeetCode-style problems (not exact copies)
3. Ensure diversity across problems (different contexts, scenarios, examples)
4. Create variations by changing:
   - Real-world context (e-commerce, social media, gaming, finance, etc.)
   - Variable names and terminology
   - Specific constraints and edge cases
   - Test case scenarios
5. Maintain consistent difficulty within each problem's level
6. Include 4-6 test cases per problem with diverse scenarios

VARIATION STRATEGY:
- Problem 1: Use e-commerce/shopping context
- Problem 2: Use social media/networking context
- Problem 3: Use data analytics/reporting context
- Problem 4: Use system design/infrastructure context
- Problem 5: Use gaming/entertainment context
(Rotate contexts if more than 5 problems)

OUTPUT FORMAT (JSON):
{
  "totalEstimatedTime": <sum of all solve times>,
  "problems": [
    {
      "id": 1,
      "title": "<Unique problem title>",
      "skill": "<skill>",
      "language": "<programming language>",
      "difficulty": "<difficulty level>",
      "estimatedSolveTime": <minutes>,
      "description": "<Clear problem description>",
      "requirements": ["<requirement 1>", ...],
      "targetSkills": ["<skill 1>", ...],
      "input_format": "<input format description>",
      "output_format": "<output format description>",
      "constraints": ["<constraint 1>", ...],
      "test_cases": [
        {
          "input": "<input>",
          "output": "<output>",
          "explanation": "<explanation>"
        },
        ...
      ],
      "evaluation_criteria": [
        "Correctness: All test cases pass",
        "Time Complexity: Optimal solution",
        "Space Complexity: Efficient memory usage",
        "Code Quality: Clean and maintainable",
        "Edge Cases: Proper handling"
      ],
      "hints": ["<hint 1>", "<hint 2>", "<hint 3>"],
      "relatedConcepts": ["<concept 1>", ...]
    },
    ... (${totalProblems} total problems)
  ]
}

Generate all ${totalProblems} problems now with maximum diversity and quality.`;

  return prompt;
}

/**
 * Generates a prompt for a specific problem type with additional context
 *
 * @param {object} options - Configuration options
 * @param {string} options.skill - Programming skill
 * @param {string} options.difficulty - Difficulty level
 * @param {string} options.focusArea - Specific area to focus on (optional)
 * @param {array} options.avoidPatterns - Patterns to avoid (optional)
 * @param {string} options.context - Real-world context (optional)
 * @returns {string} Customized prompt
 */
function generateCustomQuestionPrompt(options) {
  const { skill, difficulty, focusArea, avoidPatterns = [], context = 'general software development' } = options;

  const patterns = getPatternForSkill(skill, difficulty);
  const metadata = getDifficultyMetadata(difficulty);

  if (!patterns || !metadata) {
    throw new Error(`Invalid skill or difficulty: ${skill}, ${difficulty}`);
  }

  const focusSection = focusArea
    ? `\nSPECIAL FOCUS: This problem should specifically emphasize ${focusArea}.`
    : '';

  const avoidSection = avoidPatterns.length > 0
    ? `\nAVOID THESE PATTERNS: ${avoidPatterns.join(', ')}`
    : '';

  const prompt = `Create a ${skill} coding problem at ${metadata.label} difficulty level.

CONTEXT: ${context}
${focusSection}${avoidSection}

PROBLEM PARAMETERS:
- Difficulty: ${metadata.label}
- Time Limit: ${metadata.estimatedTime}
- Complexity Requirements: ${patterns.constraints.timeComplexity}
- Available Patterns: ${patterns.patterns.join(', ')}
- LeetCode Inspiration: ${patterns.leetcodeReferences.slice(0, 2).join(', ')}

Create a VARIATION (not exact copy) that:
1. Fits the ${context} domain
2. Tests ${skill} proficiency at ${metadata.label} level
3. Can be solved in ${metadata.estimatedTime}
4. Includes 5-6 diverse test cases
5. Has clear evaluation criteria

Return valid JSON following this structure:
{
  "id": 1,
  "title": "<problem title>",
  "skill": "${skill}",
  "language": "${skill}",
  "difficulty": "${difficulty}",
  "estimatedSolveTime": <minutes>,
  "description": "<problem description>",
  "requirements": [...],
  "targetSkills": [...],
  "input_format": "<format>",
  "output_format": "<format>",
  "constraints": [...],
  "test_cases": [...],
  "evaluation_criteria": [...],
  "hints": [...],
  "relatedConcepts": [...]
}`;

  return prompt;
}

/**
 * Generates a system message for consistent AI behavior
 *
 * @returns {string} System message for AI model
 */
function getSystemMessage() {
  return `You are an expert technical interviewer and problem setter with deep knowledge of:
- LeetCode problem patterns and difficulty calibration
- Software engineering best practices
- Algorithm design and complexity analysis
- Multiple programming languages and their idioms
- Real-world coding scenarios and applications

Your task is to create high-quality, LeetCode-inspired coding problems that:
1. Accurately match the specified difficulty level
2. Test relevant skills and concepts
3. Include comprehensive test cases with edge cases
4. Provide clear problem statements and constraints
5. Offer helpful hints without giving away solutions
6. Represent VARIATIONS of existing problems (not exact copies)

Always output valid JSON matching the requested structure exactly.
Focus on creating problems that are fair, well-defined, and properly scoped for the time limit.`;
}

/**
 * Extracts and validates the JSON response from AI
 *
 * @param {string} aiResponse - Raw response from AI
 * @returns {object} Parsed and validated problem set
 */
function parseAIResponse(aiResponse) {
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;

    const parsed = JSON.parse(jsonString.trim());

    // Validate structure
    if (!parsed.problems || !Array.isArray(parsed.problems)) {
      throw new Error('Response must contain a problems array');
    }

    // Validate each problem has required fields
    parsed.problems.forEach((problem, index) => {
      const requiredFields = [
        'title', 'skill', 'difficulty', 'description',
        'test_cases', 'evaluation_criteria'
      ];

      requiredFields.forEach(field => {
        if (!problem[field]) {
          throw new Error(`Problem ${index + 1} missing required field: ${field}`);
        }
      });

      // Ensure test_cases is an array with at least 3 cases
      if (!Array.isArray(problem.test_cases) || problem.test_cases.length < 3) {
        throw new Error(`Problem ${index + 1} must have at least 3 test cases`);
      }
    });

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

module.exports = {
  generateQuestionPrompt,
  generateBatchQuestionPrompt,
  generateCustomQuestionPrompt,
  getSystemMessage,
  parseAIResponse
};
