// shared/ValueAlignmentEngine.js

/**
 * ValueAlignmentEngine: The "Overall Logic" of Twin-AI.
 * Synthesizes performance (Bolt), value (Midas), architecture (Oracle),
 * experience (Palette), security (Sentinel), and data (Tuber).
 */
class ValueAlignmentEngine {
    constructor(db) {
        this.db = db;
    }

    /**
     * Calculates the holistic alignment score for a profile.
     * This is the "living thought structure" synthesized from all dimensions.
     */
    async calculateHolisticAlignment(profileId) {
        const stats = {
            totalImpact: 0,
            dimensionCount: 0,
            synergyDensity: 0,
            confidenceAverage: 0,
            stabilityScore: 0,
            privacyShieldScore: 0,   // SENTINEL
            coherenceStrategic: 0,   // SUN TZU
            experienceClarity: 0     // PALETTE
        };

        try {
            // 1. MIDAS: Total Value Impact
            const impactRow = this.db.prepare(`
                SELECT SUM(impact_score) as total_impact, AVG(confidence) as avg_conf, COUNT(DISTINCT dimension_id) as dim_count
                FROM patterns
                WHERE profile_id = ? AND confidence > 0.3
            `).get(profileId);

            if (impactRow) {
                stats.totalImpact = impactRow.total_impact || 0;
                stats.confidenceAverage = impactRow.avg_conf || 0;
                stats.dimensionCount = impactRow.dim_count || 0;
            }

            // 2. ORACLE: Synergy Density (Connectedness of the twin)
            const synergyRow = this.db.prepare(`
                SELECT COUNT(*) as synergy_count
                FROM patterns
                WHERE profile_id = ? AND pattern_type LIKE 'synergy_%'
            `).get(profileId);

            if (synergyRow && stats.dimensionCount > 1) {
                // Density = actual synergies / potential synergies
                const potential = (stats.dimensionCount * (stats.dimensionCount - 1)) / 2;
                stats.synergyDensity = potential > 0 ? synergyRow.synergy_count / potential : 0;
            }

            // 3. BOLT: Stability Score (Temporal consistency)
            // Uses last_updated to see if patterns are oscillating or settling
            const stabilityRow = this.db.prepare(`
                SELECT AVG(julianday('now') - julianday(last_updated)) as age
                FROM patterns
                WHERE profile_id = ?
            `).get(profileId);

            stats.stabilityScore = stabilityRow ? Math.min(1.0, stabilityRow.age / 30.0) : 0.5;

            // 4. SENTINEL: Privacy Shield Score
            // Calculate based on RLS effectiveness and data minimization
            // (Mocked for logic representation)
            stats.privacyShieldScore = Math.min(1.0, (stats.dimensionCount * 0.1) + 0.5);

            // 5. SUN TZU: Strategic Coherence
            // Measures the breadth vs depth balance
            const strategicBalance = 1.0 - Math.abs((stats.dimensionCount / 15) - stats.confidenceAverage);
            stats.coherenceStrategic = Math.max(0, strategicBalance);

            // 6. PALETTE: Experience Clarity
            // Measures engagement rate and response time efficiency
            const performanceRow = this.db.prepare(`
                SELECT engagement_rate
                FROM v_current_profile
                WHERE id = ?
            `).get(profileId);
            stats.experienceClarity = performanceRow ? performanceRow.engagement_rate : 0.7;

        } catch (error) {
            console.error("ValueAlignmentEngine Error:", error);
        }

        // The "Overall Logic" calculation - Harmonized Identities
        // BOLT (0.1) + ORACLE (0.2) + MIDAS (0.2) + SENTINEL (0.2) + SUN TZU (0.15) + PALETTE (0.15)
        const alignmentScore = (
            (stats.stabilityScore * 0.1) +      // BOLT
            (stats.synergyDensity * 0.2) +      // ORACLE
            (stats.confidenceAverage * 0.2) +   // MIDAS (via confidence)
            (stats.privacyShieldScore * 0.2) +  // SENTINEL
            (stats.coherenceStrategic * 0.15) + // SUN TZU
            (stats.experienceClarity * 0.15)    // PALETTE
        );

        return {
            score: alignmentScore,
            breakdown: stats,
            interpretation: this._getInterpretation(alignmentScore)
        };
    }

    _getInterpretation(score) {
        if (score > 0.8) return "Harmonious: Your digital twin is deeply aligned with your core values.";
        if (score > 0.5) return "Evolving: The twin is forming a coherent structure but still adapting.";
        if (score > 0.2) return "Initializing: Gathering the initial dimensions of your persona.";
        return "Fragmented: More interaction is needed to establish a stable value structure.";
    }
}

module.exports = ValueAlignmentEngine;
