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
            stabilityScore: 0
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

        } catch (error) {
            console.error("ValueAlignmentEngine Error:", error);
        }

        // The "Overall Logic" calculation
        // Balanced between breadth (dimCount), depth (impact), and stability
        const alignmentScore = (
            (stats.confidenceAverage * 0.4) +
            (stats.synergyDensity * 0.3) +
            (Math.min(1.0, stats.totalImpact / 50.0) * 0.2) +
            (stats.stabilityScore * 0.1)
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
