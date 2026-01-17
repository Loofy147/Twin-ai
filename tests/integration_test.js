// tests/integration_test.js
const { db, initDb } = require('../mobile/src/database/db.js');
const ContactsIntegration = require('../mobile/src/integrations/ContactsIntegration');
const CallHistoryIntegration = require('../mobile/src/integrations/CallHistoryIntegration');
const GoogleCalendarIntegration = require('../web/src/integrations/GoogleCalendarIntegration');
const GoogleDriveIntegration = require('../web/src/integrations/GoogleDriveIntegration');
const DynamicQuestionGenerator = require('../shared/DynamicQuestionGenerator');
const AdaptiveSelectionAlgorithm = require('../shared/AdaptiveSelectionAlgorithm');
const PatternDetector = require('../shared/PatternDetector');

async function testFlow() {
    console.log("Starting Advanced Integration Test...");

    // 1. Initialize DB
    initDb();
    const profileId = 1;
    db.prepare("INSERT OR IGNORE INTO profile (id) VALUES (?)").run(profileId);

    // 2. Sync Data
    console.log("Syncing data...");
    const contacts = new ContactsIntegration();
    const calls = new CallHistoryIntegration();
    const calendar = new GoogleCalendarIntegration('fake-token');
    const drive = new GoogleDriveIntegration('fake-token');

    await contacts.syncContacts(db, profileId);
    await calls.syncCallHistory(db, profileId);
    await calendar.syncCalendar(db, profileId);
    await drive.syncDrive(db, profileId);

    // 3. Multi-round answering
    const selector = new AdaptiveSelectionAlgorithm();
    const detector = new PatternDetector();

    for (let round = 1; round <= 3; round++) {
        console.log(`\n--- Round ${round} ---`);
        const questions = await selector.selectNextQuestions(db, profileId, 5);
        console.log(`Selected ${questions.length} questions.`);

        for (const q of questions) {
            const options = db.prepare("SELECT * FROM answer_options WHERE question_id = ?").all(q.id);
            if (options.length > 0) {
                // Always pick the first option to build a pattern
                const option = options[0];
                db.prepare(`
                    INSERT INTO responses (profile_id, question_id, answer_option_id, response_type)
                    VALUES (?, ?, ?, ?)
                `).run(profileId, q.id, option.id, 'selected');
            }
        }

        const patternCount = await detector.analyzeResponses(db, profileId);
        console.log(`Detected ${patternCount} patterns.`);
    }

    // 4. Verification
    const finalPatterns = db.prepare("SELECT * FROM patterns WHERE profile_id = ?").all(profileId);
    console.log(`\nFinal Pattern Count: ${finalPatterns.length}`);

    if (finalPatterns.length > 0) {
        console.log("Sample Pattern:", JSON.stringify(finalPatterns[0]));
        console.log("SUCCESS: Advanced integration test passed.");
    } else {
        console.error("FAILURE: No patterns detected.");
        process.exit(1);
    }
}

testFlow().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
