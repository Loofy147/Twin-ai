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
        return total;
    }
}

module.exports = DynamicQuestionGenerator;
