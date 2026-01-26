// shared/DynamicQuestionGenerator.js

class DynamicQuestionGenerator {
    constructor(integrations) {
        this.integrations = integrations; // Array of integration instances
    }

    async generateAll(db) {
        let total = 0;
        for (const integration of this.integrations) {
            if (integration.generateQuestionsFromContacts) {
                const qs = await integration.generateQuestionsFromContacts(db);
                total += qs.length;
            }
            if (integration.generateQuestionsFromCallHistory) {
                const qs = await integration.generateQuestionsFromCallHistory(db);
                total += qs.length;
            }
            if (integration.generateQuestionsFromCalendar) {
                const qs = await integration.generateQuestionsFromCalendar(db);
                total += qs.length;
            }
            if (integration.generateQuestionsFromDrive) {
                const qs = await integration.generateQuestionsFromDrive(db);
                total += qs.length;
            }
        }

        // ORACLE: Generate higher-order bridge questions
        const bridgeCount = await this.generateBridgeQuestions(db);
        return total + bridgeCount;
    }

    /**
     * ORACLE: Generates bridge questions connecting real entities to societal concepts.
     * Expected: Deepens the twin's understanding of how values manifest in reality.
     */
    async generateBridgeQuestions(db) {
        // 1. Get high-priority entities (projects/people)
        const topEntities = db.prepare(`
            SELECT id, name, entity_type FROM entities
            WHERE profile_id = 1
            LIMIT 5
        `).all();

        if (topEntities.length === 0) return 0;

        // 2. Identify a target societal dimension (rotating through the new ones)
        const societalDimensions = [
            { name: 'Power & Politics', aspects: ['republic', 'constitution', 'democracy'] },
            { name: 'Economics & Trade', aspects: ['money', 'credit', 'market'] },
            { name: 'Law & Rights', aspects: ['law', 'justice', 'rights'] }
        ];

        let generated = 0;
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO questions (text, question_type, primary_dimension_id, metadata)
            VALUES (?, 'bridge', (SELECT id FROM dimensions WHERE name = ? LIMIT 1), ?)
        `);

        for (const entity of topEntities) {
            const dim = societalDimensions[generated % societalDimensions.length];
            const aspect = dim.aspects[generated % dim.aspects.length];

            let questionText = '';
            if (entity.entity_type === 'project') {
                questionText = `How does the concept of '${aspect}' (${dim.name}) influence your governance and decision-making for '${entity.name}'?`;
            } else if (entity.entity_type === 'person') {
                questionText = `In your relationship with '${entity.name}', what role does '${aspect}' (${dim.name}) play in maintaining balance or resolving conflicts?`;
            }

            if (questionText) {
                const result = insertStmt.run(questionText, dim.name, JSON.stringify({
                    entity_id: entity.id,
                    entity_name: entity.name,
                    bridge_aspect: aspect
                }));
                if (result.changes > 0) generated++;
            }

            if (generated >= 3) break; // Limit generation per run
        }

        return generated;
    }
}

module.exports = DynamicQuestionGenerator;
