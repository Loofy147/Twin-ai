// tests/integration_test.js
const { db, initDb } = require('../mobile/src/database/db.js');
const ContactsIntegration = require('../mobile/src/integrations/ContactsIntegration');
const CallHistoryIntegration = require('../mobile/src/integrations/CallHistoryIntegration');
const GoogleCalendarIntegration = require('../web/src/integrations/GoogleCalendarIntegration');
const GoogleDriveIntegration = require('../web/src/integrations/GoogleDriveIntegration');
const DynamicQuestionGenerator = require('../shared/DynamicQuestionGenerator');
const AdaptiveSelectionAlgorithm = require('../shared/AdaptiveSelectionAlgorithm');

async function testFlow() {
    console.log("Starting Integration Test...");

    // 1. Initialize DB
    initDb();
    const profileId = 1;
    db.prepare("INSERT OR IGNORE INTO profile (id) VALUES (?)").run(profileId);

    // 2. Mock Integrations
    const contacts = new ContactsIntegration();
    const calls = new CallHistoryIntegration();
    const calendar = new GoogleCalendarIntegration('fake-token');
    const drive = new GoogleDriveIntegration('fake-token');

    // 3. Sync Data
    console.log("Syncing data...");
    await contacts.syncContacts(db, profileId);
    await calls.syncCallHistory(db, profileId);
    await calendar.syncCalendar(db, profileId);
    await drive.syncDrive(db, profileId);

    // 4. Generate Dynamic Questions
    console.log("Generating dynamic questions...");
    const dynamicGen = new DynamicQuestionGenerator([contacts, calls, calendar, drive]);
    const dynamicCount = await dynamicGen.generateAll(db);
    console.log(`Generated ${dynamicCount} dynamic questions.`);

    // 5. Select Next Questions
    console.log("Selecting questions via adaptive algorithm...");
    const selector = new AdaptiveSelectionAlgorithm();
    const nextQuestions = await selector.selectNextQuestions(db, profileId, 5);

    console.log(`Selected ${nextQuestions.length} questions:`);
    nextQuestions.forEach((q, i) => {
        console.log(`${i+1}. ${q.text} (Type: ${q.question_type})`);
    });

    if (nextQuestions.length === 5) {
        console.log("SUCCESS: Integration test passed.");
    } else {
        console.error("FAILURE: Incorrect number of questions selected.");
        process.exit(1);
    }
}

testFlow().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
