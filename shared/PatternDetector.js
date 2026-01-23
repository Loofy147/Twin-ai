// shared/PatternDetector.js

class PatternDetector {
    async analyzeResponses(db, profileId) {
        /**
         * BOLT OPTIMIZATION & ACCURACY:
         * 1. Join aspects directly to get dimension_id (deeper relation).
         * 2. This is more accurate as it uses the dimension associated with the specific aspect measured.
         * 3. Potentially faster than joining the large questions table in high-response environments.
         */
        const aspectFrequency = db.prepare(`
            SELECT
                ao.aspect_id,
                a.dimension_id as primary_dimension_id,
                COUNT(*) as frequency,
                SUM(ao.weight) as total_strength
            FROM responses r
            JOIN answer_options ao ON r.answer_option_id = ao.id
            JOIN aspects a ON ao.aspect_id = a.id
            WHERE r.profile_id = ?
              AND r.response_type = 'selected'
              AND ao.aspect_id IS NOT NULL
            GROUP BY ao.aspect_id, a.dimension_id
            HAVING frequency >= 3
        `).all(profileId);

        if (!aspectFrequency || aspectFrequency.length === 0) {
            return 0;
        }

        // BOLT OPTIMIZATION: Prepare statement once outside the loop
        const insertStmt = db.prepare(`
            INSERT INTO patterns (profile_id, pattern_type, dimension_id, aspect_id, confidence, strength, evidence_count, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(profile_id, dimension_id, aspect_id) WHERE dimension_id IS NOT NULL AND aspect_id IS NOT NULL
            DO UPDATE SET
                confidence = excluded.confidence,
                strength = excluded.strength,
                evidence_count = excluded.evidence_count,
                last_updated = CURRENT_TIMESTAMP
        `);

        // BOLT OPTIMIZATION: Wrap in a transaction for synchronous disk write efficiency
        const runUpdates = db.transaction((freqs) => {
            for (const af of freqs) {
                if (!af.aspect_id) continue;

                const confidence = Math.min(1.0, af.frequency / 10.0);
                const strength = af.total_strength / af.frequency;

                insertStmt.run(profileId, 'preference', af.primary_dimension_id, af.aspect_id, confidence, strength, af.frequency);
            }
        });

        runUpdates(aspectFrequency);

        // Detect consistency (or lack thereof)
        // This is a simplified version
        return aspectFrequency.length;
    }
}

module.exports = PatternDetector;
