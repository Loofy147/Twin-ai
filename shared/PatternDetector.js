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

        runUpdates(aspectFrequency);

        // SENTINEL: Detect potentially sensitive data patterns
        await this.detectPrivacyPatterns(db, profileId);

        // TUBER: Trigger synergy detection after response analysis
        await this.detectSynergies(db, profileId);

        return aspectFrequency.length;
    }

    /**
     * SENTINEL: Detect privacy-sensitive patterns
     * Identifies dimensions with high data density that may need protection.
     */
    async detectPrivacyPatterns(db, profileId) {
        const sensitiveDimensions = [3, 8, 12]; // Relationships, Risk, Financial

        const sensitiveResult = db.prepare(`
            SELECT COUNT(*) as count
            FROM patterns
            WHERE profile_id = ? AND dimension_id IN (${sensitiveDimensions.join(',')})
              AND confidence > 0.7
        `).get(profileId);

        if (sensitiveResult && sensitiveResult.count > 2) {
            db.prepare(`
                INSERT INTO patterns (profile_id, pattern_type, confidence, strength, last_updated)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(profile_id, pattern_type) WHERE dimension_id IS NULL AND aspect_id IS NULL
                DO UPDATE SET confidence = excluded.confidence, last_updated = CURRENT_TIMESTAMP
            `).run(profileId, 'privacy_sensitivity_high', 0.9, 1.0);
        }
    }

    /**
     * TUBER + BOLT: Synergy Detection
     * Identifies correlations between high-confidence dimensions.
     * Expected: Provides higher-order insights into value alignment.
     */
    async detectSynergies(db, profileId) {
        const patterns = db.prepare(`
            SELECT dimension_id, aspect_id, confidence, strength
            FROM patterns
            WHERE profile_id = ? AND confidence > 0.5
              AND dimension_id IS NOT NULL
        `).all(profileId);

        if (patterns.length < 2) return 0;

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

        // BOLT: Use a frequency map for O(N) grouping
        const dimStats = {};
        for (const p of patterns) {
            if (!dimStats[p.dimension_id]) dimStats[p.dimension_id] = { sum: 0, count: 0 };
            dimStats[p.dimension_id].sum += p.confidence;
            dimStats[p.dimension_id].count++;
        }

        const synergies = [];
        const dims = Object.keys(dimStats);

        // Detect dimension pairings (Synergies)
        for (let i = 0; i < dims.length; i++) {
            for (let j = i + 1; j < dims.length; j++) {
                const dimA = dims[i];
                const dimB = dims[j];

                const confA = dimStats[dimA].sum / dimStats[dimA].count;
                const confB = dimStats[dimB].sum / dimStats[dimB].count;
                const synergyScore = (confA + confB) / 2;

                if (synergyScore > 0.75) {
                    synergies.push({
                        type: 'dimension_alignment',
                        metadata: JSON.stringify({
                            dim1: dimA,
                            dim2: dimB,
                            alignment: synergyScore,
                            description: 'Strong alignment between these dimensions'
                        }),
                        score: synergyScore
                    });
                }
            }
        }

        if (synergies.length > 0) {
            const runSynergies = db.transaction((syns) => {
                for (const s of syns) {
                    const meta = JSON.parse(s.metadata);
                    // MIDAS: Synergies have higher baseline impact (1.5x multiplier)
                    const impact = s.score * 1.5;
                    synergyInsert.run(profileId, `synergy_${s.type}_${meta.dim1}_${meta.dim2}`, s.metadata, s.score, s.score, impact);
                }
            });
            runSynergies(synergies);
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
