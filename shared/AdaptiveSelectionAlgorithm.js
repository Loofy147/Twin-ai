// shared/AdaptiveSelectionAlgorithm.js
// Based on learning-algorithm.md

class AdaptiveSelectionAlgorithm {
    async selectNextQuestions(db, profileId, limit = 10) {
        // 1. Get candidate questions (not yet answered by this profile)
        /**
         * BOLT OPTIMIZATION:
         * 1. Replaced LEFT JOIN with NOT EXISTS for faster exclusion in SQLite.
         * 2. Added ORDER BY engagement_factor DESC and LIMIT 500.
         * 3. Utilizing 'idx_questions_active_engagement' index for O(log N) lookup.
         * Expected Impact: Reduces candidate scoring set from O(N_all) to O(1) (max 500).
         * This significantly reduces JS heap overhead and processing time for large question banks.
         */
        // BOLT: Added await for compatibility with async DB adapters
        const candidates = await db.prepare(`
            SELECT q.* FROM questions q
            WHERE q.active = 1 AND NOT EXISTS (
                SELECT 1 FROM responses r
                WHERE r.question_id = q.id AND r.profile_id = ?
            )
            ORDER BY q.engagement_factor DESC
            LIMIT 500
        `).all(profileId);

        if (candidates.length === 0) return [];

        // 2. Get dimension coverage for the profile
        // BOLT: Added await for compatibility with async DB adapters
        const coverageRows = await db.prepare(`
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
        // BOLT: Added await for compatibility with async DB adapters
        const lowConfidenceDimensions = new Set(
            (await db.prepare(`
                SELECT dimension_id FROM patterns
                WHERE profile_id = ? AND confidence < 0.4
            `).all(profileId)).map(p => p.dimension_id)
        );

        // 4. Scoring function
        // BOLT OPTIMIZATION: Pre-calculate total responses and target difficulty outside the loop
        const totalResponses = Object.values(coverageMap).reduce((a, b) => a + b, 0);
        const targetDifficulty = Math.min(5, Math.floor(totalResponses / 20) + 1);

        // BOLT OPTIMIZATION: Pre-calculate coverage scores for all dimensions to avoid redundant divisions in the loop
        const dimensionCoverageScores = {};
        for (const dimId in coverageMap) {
            dimensionCoverageScores[dimId] = (1.0 / (coverageMap[dimId] + 1)) * 0.4;
        }

        const scoredQuestions = candidates.map(q => {
            let score = 0.0;

            // Factor 1: Coverage - Unexplored dimensions get priority
            // O(1) lookup instead of division
            score += dimensionCoverageScores[q.primary_dimension_id] || 0.4;

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
