// shared/generateInitialBank.js
const { db, initDb } = require('../mobile/src/database/db.js');
const QuestionBankGenerator = require('./QuestionBankGenerator');

async function main() {
    initDb();

    // Clear old data for a fresh start in this demo
    db.prepare("DELETE FROM questions").run();
    db.prepare("DELETE FROM dimensions").run();

    // Create initial profile
    db.prepare("INSERT OR IGNORE INTO profile (id) VALUES (1)").run();

    const generator = new QuestionBankGenerator();
    const count = await generator.populateBank(db);
    console.log(`Populated bank with ${count} static questions.`);
}

main().catch(console.error);
