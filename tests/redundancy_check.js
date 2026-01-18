const { db, initDb } = require('../mobile/src/database/db.js');
const ContactsIntegration = require('../mobile/src/integrations/ContactsIntegration');
const CallHistoryIntegration = require('../mobile/src/integrations/CallHistoryIntegration');
const GoogleCalendarIntegration = require('../web/src/integrations/GoogleCalendarIntegration');
const GoogleDriveIntegration = require('../web/src/integrations/GoogleDriveIntegration');
const fs = require('fs');
const path = require('path');

async function runRedundancyCheck() {
    console.log("Starting Redundancy Check Test...");

    // Clear old data for a fresh start in this test
    initDb();
    db.prepare("DELETE FROM responses").run();
    db.prepare("DELETE FROM answer_options").run();
    db.prepare("DELETE FROM questions").run();
    db.prepare("DELETE FROM entities").run();
    db.prepare("DELETE FROM patterns").run();
    db.prepare("DELETE FROM aspects").run();
    db.prepare("DELETE FROM dimensions").run();

    // Seed dimensions
    const dimensions = [
        'Values', 'Work Style', 'Relationships', 'Learning', 'Decision Making',
        'Time Management', 'Creativity', 'Risk Tolerance', 'Communication',
        'Physical Environment', 'Mental State', 'Financial', 'Social',
        'Health', 'Spirituality/Purpose'
    ];
    dimensions.forEach((name, idx) => {
        db.prepare("INSERT INTO dimensions (id, name) VALUES (?, ?)").run(idx + 1, name);
    });

    const profileId = 1;
    db.prepare("INSERT OR IGNORE INTO profile (id) VALUES (?)").run(profileId);

    const contacts = new ContactsIntegration();
    const calls = new CallHistoryIntegration();
    const calendar = new GoogleCalendarIntegration('fake-token');
    const drive = new GoogleDriveIntegration('fake-token');

    async function syncAll() {
        console.log("Syncing all integrations...");
        await contacts.syncContacts(db, profileId);
        await contacts.generateQuestionsFromContacts(db, profileId);
        await calls.syncCallHistory(db, profileId);
        await calls.generateQuestionsFromCallHistory(db);
        await calendar.syncCalendar(db, profileId);
        await calendar.generateQuestionsFromCalendar(db);
        await drive.syncDrive(db, profileId);
        await drive.generateQuestionsFromDrive(db);
    }

    // First Sync
    await syncAll();

    const count1 = {
        entities: db.prepare("SELECT COUNT(*) as c FROM entities").get().c,
        questions: db.prepare("SELECT COUNT(*) as c FROM questions").get().c,
        patterns: db.prepare("SELECT COUNT(*) as c FROM patterns").get().c
    };
    console.log("Initial counts:", count1);

    // Second Sync
    await syncAll();

    const count2 = {
        entities: db.prepare("SELECT COUNT(*) as c FROM entities").get().c,
        questions: db.prepare("SELECT COUNT(*) as c FROM questions").get().c,
        patterns: db.prepare("SELECT COUNT(*) as c FROM patterns").get().c
    };
    console.log("Counts after second sync:", count2);

    let failed = false;
    if (count1.entities !== count2.entities) {
        console.error(`FAILURE: Entities count changed from ${count1.entities} to ${count2.entities}`);
        failed = true;
    }
    if (count1.questions !== count2.questions) {
        console.error(`FAILURE: Questions count changed from ${count1.questions} to ${count2.questions}`);
        failed = true;
    }
    if (count1.patterns !== count2.patterns) {
        console.error(`FAILURE: Patterns count changed from ${count1.patterns} to ${count2.patterns}`);
        failed = true;
    }

    if (!failed) {
        console.log("SUCCESS: No redundancy detected after multiple syncs.");
    } else {
        process.exit(1);
    }
}

runRedundancyCheck().catch(err => {
    console.error(err);
    process.exit(1);
});
