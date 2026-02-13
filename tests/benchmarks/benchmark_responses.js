const Database = require('better-sqlite3');
const PatternDetector = require('../../shared/PatternDetector');
const { performance } = require('perf_hooks');

async function runBenchmark() {
    const db = new Database(':memory:');

    // Initialize schema
    db.exec(`
        CREATE TABLE profile (id INTEGER PRIMARY KEY);
        CREATE TABLE dimensions (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE aspects (id INTEGER PRIMARY KEY, dimension_id INTEGER, name TEXT, code TEXT);
        CREATE TABLE answer_options (id INTEGER PRIMARY KEY, question_id INTEGER, aspect_id INTEGER, weight REAL);
        CREATE TABLE responses (
            id INTEGER PRIMARY KEY,
            profile_id INTEGER,
            question_id INTEGER,
            answer_option_id INTEGER,
            response_type TEXT,
            confidence_level REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE patterns (
            profile_id INTEGER,
            pattern_type TEXT,
            dimension_id INTEGER,
            aspect_id INTEGER,
            confidence REAL,
            strength REAL,
            evidence_count INTEGER,
            impact_score REAL,
            last_updated DATETIME
        );
        CREATE UNIQUE INDEX idx_patterns_unique_aspect ON patterns(profile_id, dimension_id, aspect_id) WHERE dimension_id IS NOT NULL AND aspect_id IS NOT NULL;
        CREATE UNIQUE INDEX idx_patterns_unique_type ON patterns(profile_id, pattern_type) WHERE dimension_id IS NULL AND aspect_id IS NULL;

        -- Current indexes in schema.sql
        CREATE INDEX idx_responses_profile ON responses(profile_id);
    `);

    // Seed data
    db.prepare("INSERT INTO profile (id) VALUES (1)").run();
    db.prepare("INSERT INTO dimensions (id, name) VALUES (1, 'Values')").run();
    db.prepare("INSERT INTO aspects (id, dimension_id, name, code) VALUES (1, 1, 'freedom', 'VAL_FREEDOM')").run();
    db.prepare("INSERT INTO answer_options (id, question_id, aspect_id, weight) VALUES (1, 1, 1, 1.0)").run();

    const N = 10000;
    const insertResponse = db.prepare(`
        INSERT INTO responses (profile_id, question_id, answer_option_id, response_type, confidence_level)
        VALUES (1, ?, 1, 'selected', 1.0)
    `);

    db.transaction(() => {
        for (let i = 0; i < N; i++) {
            insertResponse.run(i);
        }
    })();

    console.log(`Seeded ${N} responses.`);

    const detector = new PatternDetector();

    async function measure() {
        const start = performance.now();
        await detector.analyzeResponses(db, 1);
        const end = performance.now();
        return end - start;
    }

    // Warm up
    await measure();

    let totalWithoutIndex = 0;
    for (let i = 0; i < 5; i++) {
        totalWithoutIndex += await measure();
    }
    console.log(`Average time WITHOUT covering index: ${(totalWithoutIndex / 5).toFixed(2)}ms`);

    // Add the covering index
    db.exec(`CREATE INDEX idx_responses_pattern_detection ON responses(profile_id, response_type, answer_option_id);`);

    // Warm up
    await measure();

    let totalWithIndex = 0;
    for (let i = 0; i < 5; i++) {
        totalWithIndex += await measure();
    }
    console.log(`Average time WITH covering index: ${(totalWithIndex / 5).toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
