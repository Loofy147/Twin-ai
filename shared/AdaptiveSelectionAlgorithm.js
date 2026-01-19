// shared/AdaptiveSelectionAlgorithm.js
// Based on learning-algorithm.md

class AdaptiveSelectionAlgorithm {
    async selectNextQuestions(db, profileId, limit = 10) {
        // 1. Get candidate questions (not yet answered by this profile)
        const candidates = db.prepare(`
            SELECT q.* FROM questions q
            LEFT JOIN responses r ON q.id = r.question_id AND r.profile_id = ?
            WHERE r.id IS NULL AND q.active = 1
        `).all(profileId);

        if (candidates.length === 0) return [];

        // 2. Get dimension coverage for the profile
        const coverageRows = db.prepare(`
            SELECT primary_dimension_id, COUNT(*) as response_count
            FROM responses r
            JOIN questions q ON r.question_id = q.id
            WHERE r.profile_id = ?
            GROUP BY primary_dimension_id
        `).all(profileId);

        const coverageMap = {};
        coverageRows.forEach(row => {
            coverageMap[row.primary_dimension_id] = row.response_count;
        });

        // 3. Get patterns with low confidence (< 0.4)
        // BOLT OPTIMIZATION: Use a Set for O(1) lookups inside the candidate loop
        const lowConfidenceDimensions = new Set(
            db.prepare(`
                SELECT dimension_id FROM patterns
                WHERE profile_id = ? AND confidence < 0.4
            `).all(profileId).map(p => p.dimension_id)
        );

        // 4. Scoring function
        // BOLT OPTIMIZATION: Pre-calculate total responses and target difficulty outside the loop
        const totalResponses = Object.values(coverageMap).reduce((a, b) => a + b, 0);
        const targetDifficulty = Math.min(5, Math.floor(totalResponses / 20) + 1);

        const scoredQuestions = candidates.map(q => {
            let score = 0.0;

            // Factor 1: Coverage - Unexplored dimensions get priority
            const dimensionResponses = coverageMap[q.primary_dimension_id] || 0;
            score += (1.0 / (dimensionResponses + 1)) * 0.4;

            // Factor 2: Trade-off Prioritization
            // If dimension confidence is low, prioritize trade-offs to force choices
            if (q.question_type === 'trade_off' && lowConfidenceDimensions.has(q.primary_dimension_id)) {
                score += 0.5;
            }

            // Factor 3: Difficulty Progression
            // As user answers more, increase difficulty
            if (q.difficulty_level === targetDifficulty) {
                score += 0.2;
            } else if (Math.abs(q.difficulty_level - targetDifficulty) === 1) {
                score += 0.1;
            }

            // Factor 4: Engagement Factor
            score += (q.engagement_factor || 1.0) * 0.15;

            // Factor 5: Randomness
            score += Math.random() * 0.1;

            return { question: q, score };
        });

        // 5. Sort by score and return top candidates
        scoredQuestions.sort((a, b) => b.score - a.score);

        return scoredQuestions.slice(0, limit).map(sq => sq.question);
    }
}

module.exports = AdaptiveSelectionAlgorithm;
