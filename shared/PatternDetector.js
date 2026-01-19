// shared/PatternDetector.js

class PatternDetector {
    async analyzeResponses(db, profileId) {
        // Find high-frequency aspects in responses
        // GROUP BY aspect_id in answer_options joined with responses
        const aspectFrequency = db.prepare(`
            SELECT ao.aspect_id, q.primary_dimension_id, COUNT(*) as frequency, SUM(ao.weight) as total_strength
            FROM responses r
            JOIN answer_options ao ON r.answer_option_id = ao.id
            JOIN questions q ON r.question_id = q.id
            WHERE r.profile_id = ? AND r.response_type = 'selected'
            GROUP BY ao.aspect_id
            HAVING frequency >= 3
        `).all(profileId);

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
