// shared/PatternDetector.js

class PatternDetector {
    async analyzeResponses(db, profileId) {
        /**
         * BOLT OPTIMIZATION & ACCURACY:
         * 1. Join aspects directly to get dimension_id (deeper relation).
         * 2. This is more accurate as it uses the dimension associated with the specific aspect measured.
         * 3. Potentially faster than joining the large questions table in high-response environments.
         */
        // BOLT: Added await for compatibility with async DB adapters (Node.js/Mobile)
        const aspectFrequency = await db.prepare(`
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
        // MIDAS OPTIMIZATION: Added impact_score calculation
        const insertStmt = db.prepare(`
            INSERT INTO patterns (profile_id, pattern_type, dimension_id, aspect_id, confidence, strength, evidence_count, impact_score, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(profile_id, dimension_id, aspect_id) WHERE dimension_id IS NOT NULL AND aspect_id IS NOT NULL
            DO UPDATE SET
                confidence = excluded.confidence,
                strength = excluded.strength,
                evidence_count = excluded.evidence_count,
                impact_score = excluded.impact_score,
                last_updated = CURRENT_TIMESTAMP
        `);

        // BOLT OPTIMIZATION: Wrap in a transaction for synchronous disk write efficiency
        const runUpdates = db.transaction((freqs) => {
            for (const af of freqs) {
                if (!af.aspect_id) continue;

                const confidence = Math.min(1.0, af.frequency / 10.0);
                const strength = af.total_strength / af.frequency;
                const impact = confidence * strength; // MIDAS: Initial impact metric

                insertStmt.run(profileId, 'preference', af.primary_dimension_id, af.aspect_id, confidence, strength, af.frequency, impact);
            }
        });

        // BOLT: Added await for compatibility with async DB adapters
        await runUpdates(aspectFrequency);

        // TUBER: Trigger synergy detection after response analysis
        await this.detectSynergies(db, profileId);

        return aspectFrequency.length;
    }

    /**
     * TUBER + BOLT: Synergy Detection
     * Identifies correlations between high-confidence dimensions.
     * Expected: Provides higher-order insights into value alignment.
     */
    async detectSynergies(db, profileId) {
        // BOLT OPTIMIZATION: Move aggregation and sorting to SQL to reduce JS overhead and data transfer.
        // Complexity: O(N) in DB (indexed) instead of O(N) in JS + O(D log D) sort.
        const dimList = await db.prepare(`
            SELECT dimension_id as id, AVG(confidence) as avg
            FROM patterns
            WHERE profile_id = ? AND confidence > 0.5 AND dimension_id IS NOT NULL
            GROUP BY dimension_id
            ORDER BY avg DESC
        `).all(profileId);

        if (dimList.length < 2) return 0;

        const synergyInsert = db.prepare(`
            INSERT INTO patterns (profile_id, pattern_type, metadata, confidence, strength, impact_score, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(profile_id, pattern_type) WHERE dimension_id IS NULL AND aspect_id IS NULL
            DO UPDATE SET
                confidence = excluded.confidence,
                metadata = excluded.metadata,
                impact_score = excluded.impact_score,
                last_updated = CURRENT_TIMESTAMP
        `);

        const synergies = [];
        const n = dimList.length;

        // BOLT OPTIMIZATION: Pruned O(D^2) loop. Threshold is 0.75, so avgA + avgB > 1.5.
        // Expected: -80% iterations when many dimensions are below the threshold.
        for (let i = 0; i < n; i++) {
            const dimA = dimList[i];

            // If dimA plus the next best dimension (i+1) is below 1.5,
            // then no remaining pairs can satisfy the condition.
            if (i + 1 < n && dimA.avg + dimList[i+1].avg <= 1.5) break;

            for (let j = i + 1; j < n; j++) {
                const dimB = dimList[j];

                // If dimA + dimB is below 1.5, and dimList is sorted descending,
                // no more B's for this A will satisfy the condition.
                if (dimA.avg + dimB.avg <= 1.5) break;

                const synergyScore = (dimA.avg + dimB.avg) / 2;

                synergies.push({
                    dim1: dimA.id,
                    dim2: dimB.id,
                    score: synergyScore,
                    type: 'dimension_alignment',
                    // BOLT: Pre-stringify metadata to avoid redundant operations in loop
                    metadata: JSON.stringify({
                        dim1: dimA.id,
                        dim2: dimB.id,
                        alignment: synergyScore,
                        description: 'Strong alignment between these dimensions'
                    })
                });
            }
        }

        if (synergies.length > 0) {
            const runSynergies = db.transaction((syns) => {
                for (const s of syns) {
                    // MIDAS: Synergies have higher baseline impact (1.5x multiplier)
                    const impact = s.score * 1.5;
                    // BOLT: Removed redundant JSON.parse(s.metadata) inside transaction
                    synergyInsert.run(profileId, `synergy_${s.type}_${s.dim1}_${s.dim2}`, s.metadata, s.score, s.score, impact);
                }
            });
            // BOLT: Added await for compatibility with async DB adapters
            await runSynergies(synergies);
        }

        return synergies.length;
    }

    /**
     * SUN-TZU: Strategic Alignment Summary
     * Provides a high-level overview of the twin's coherence.
     */
    async getAlignmentSummary(db, profileId) {
        const ValueAlignmentEngine = require('./ValueAlignmentEngine');
        const engine = new ValueAlignmentEngine(db);
        return await engine.calculateHolisticAlignment(profileId);
    }
}

module.exports = PatternDetector;
