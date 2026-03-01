/**
 * Difficulty Mapper Utility
 * Maps candidate star ratings to adaptive difficulty levels for technical assessments
 */
const DIFFICULTY_LEVELS = {
    LEVEL1: 'level1', LEVEL2: 'level2', LEVEL3: 'level3', LEVEL4: 'level4', LEVEL5: 'level5'
};
const LEGACY_DIFFICULTY_MAP = {
    easy: 'level2', Easy: 'level2', medium: 'level3', Medium: 'level3',
    hard: 'level4', Hard: 'level4', beginner: 'beginner', Beginner: 'beginner',
    intermediate: 'intermediate', Intermediate: 'intermediate', advanced: 'advanced', Advanced: 'advanced'
};
const DIFFICULTY_METADATA = {
    level1: { label: 'Level 1 - Beginner', estimatedTime: '10-15 minutes', targetAudience: 'Junior developers', colorCode: '#4ade80' },
    level2: { label: 'Level 2 - Intermediate Beginner', estimatedTime: '15-20 minutes', targetAudience: 'Developers with 1-2 years experience', colorCode: '#22c55e' },
    level3: { label: 'Level 3 - Intermediate', estimatedTime: '20-30 minutes', targetAudience: 'Mid-level developers', colorCode: '#eab308' },
    level4: { label: 'Level 4 - Advanced', estimatedTime: '30-40 minutes', targetAudience: 'Senior developers', colorCode: '#f97316' },
    level5: { label: 'Level 5 - Expert', estimatedTime: '40-60 minutes', targetAudience: 'Staff/Principal engineers', colorCode: '#ef4444' }
};

function mapStarRatingToDifficulty(starRating) {
    if (starRating === null || starRating === undefined || isNaN(starRating)) return DIFFICULTY_LEVELS.LEVEL1;
    const normalizedRating = Math.max(0, Math.min(5, Math.round(starRating)));
    const adaptiveLevel = Math.min(normalizedRating + 1, 5);
    return `level${Math.max(adaptiveLevel, 1)}`;
}

function getDifficultyMetadata(level) {
    const normalizedLevel = normalizeDifficultyLevel(level);
    return DIFFICULTY_METADATA[normalizedLevel] || null;
}

function normalizeDifficultyLevel(level) {
    if (!level) return DIFFICULTY_LEVELS.LEVEL1;
    const lowercaseLevel = level.toLowerCase();
    if (Object.values(DIFFICULTY_LEVELS).includes(lowercaseLevel)) return lowercaseLevel;
    if (LEGACY_DIFFICULTY_MAP[level]) return LEGACY_DIFFICULTY_MAP[level];
    return DIFFICULTY_LEVELS.LEVEL1;
}

function isNonTechnicalDifficulty(level) {
    return ['beginner', 'intermediate', 'advanced'].includes(level?.toLowerCase());
}

module.exports = {
    DIFFICULTY_LEVELS, DIFFICULTY_METADATA, LEGACY_DIFFICULTY_MAP,
    mapStarRatingToDifficulty, getDifficultyMetadata, normalizeDifficultyLevel, isNonTechnicalDifficulty
};
