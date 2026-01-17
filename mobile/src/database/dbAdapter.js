// mobile/src/database/dbAdapter.js
// Universal adapter for both React Native and Node.js testing environments

let db;

if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    // React Native environment
    const SQLite = require('react-native-sqlite-storage');

    // In a real mobile app, we would open the database like this:
    // db = SQLite.openDatabase({ name: 'twin-ai.db', location: 'default' });

    // Providing a compatible interface for the rest of the app
    db = {
        transaction: (callback) => {
            // Real implementation would use SQLite.transaction
        },
        prepare: (sql) => {
            return {
                run: (...args) => {
                    // In RN, we'd use db.executeSql
                    console.log("[Mobile DB] Executing run:", sql, args);
                },
                get: (...args) => {
                    console.log("[Mobile DB] Executing get:", sql, args);
                    return {};
                },
                all: (...args) => {
                    console.log("[Mobile DB] Executing all:", sql, args);
                    return [];
                }
            };
        }
    };
} else {
    // Node.js environment for testing
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, 'twin-ai.db');
    db = new Database(dbPath);
}

module.exports = db;
