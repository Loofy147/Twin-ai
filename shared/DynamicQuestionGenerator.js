// shared/DynamicQuestionGenerator.js

class DynamicQuestionGenerator {
    constructor(integrations) {
        this.integrations = integrations; // Array of integration instances
    }

    async generateAll(db) {
        const tasks = [];

        for (const integration of this.integrations) {
            if (integration.generateQuestionsFromContacts) {
                tasks.push(integration.generateQuestionsFromContacts(db));
            }
            if (integration.generateQuestionsFromCallHistory) {
                tasks.push(integration.generateQuestionsFromCallHistory(db));
            }
            if (integration.generateQuestionsFromCalendar) {
                tasks.push(integration.generateQuestionsFromCalendar(db));
            }
            if (integration.generateQuestionsFromDrive) {
                tasks.push(integration.generateQuestionsFromDrive(db));
            }
        }

        // ⚡ Bolt: Run all generation tasks in parallel to minimize total latency.
        // This is especially effective if integrations perform network I/O.
        const results = await Promise.all(tasks);
        return results.reduce((sum, qs) => sum + (qs?.length || 0), 0);
    }
}

module.exports = DynamicQuestionGenerator;
