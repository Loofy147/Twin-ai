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
            /**
             * BOLT OPTIMIZATION: Consolidated 3 database queries into a single aggregate scan.
             * 1. MIDAS: Total Value Impact & Confidence (filtered by threshold)
             * 2. ORACLE: Synergy Count (for density calculation)
             * 3. BOLT: Average Age (for stability score)
             * Reducing roundtrips improves performance especially in high-latency or concurrent environments.
             */
            const aggregatedRow = await this.db.prepare(`
                SELECT
                    SUM(CASE WHEN confidence > 0.3 THEN impact_score ELSE 0 END) as total_impact,
                    AVG(CASE WHEN confidence > 0.3 THEN confidence END) as avg_conf,
                    COUNT(DISTINCT CASE WHEN confidence > 0.3 THEN dimension_id END) as dim_count,
                    COUNT(CASE WHEN pattern_type LIKE 'synergy_%' THEN 1 END) as synergy_count,
                    AVG(julianday('now') - julianday(last_updated)) as age
                FROM patterns
                WHERE profile_id = ?
            `).get(profileId);

            if (aggregatedRow) {
                stats.totalImpact = aggregatedRow.total_impact || 0;
                stats.confidenceAverage = aggregatedRow.avg_conf || 0;
                stats.dimensionCount = aggregatedRow.dim_count || 0;

                if (stats.dimensionCount > 1) {
                    const synergyCount = aggregatedRow.synergy_count || 0;
                    const potential = (stats.dimensionCount * (stats.dimensionCount - 1)) / 2;
                    stats.synergyDensity = potential > 0 ? synergyCount / potential : 0;
                }

                stats.stabilityScore = aggregatedRow.age !== null ? Math.min(1.0, aggregatedRow.age / 30.0) : 0.5;
            }

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
