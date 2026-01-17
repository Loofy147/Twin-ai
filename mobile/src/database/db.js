const db = require('./dbAdapter');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.sql');

function initDb() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    if (db.exec) {
        db.exec(schema);
    }
    console.log('Database initialized successfully.');
}

module.exports = {
    db,
    initDb
};
