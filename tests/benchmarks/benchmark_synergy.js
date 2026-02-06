const Database = require('better-sqlite3');
const PatternDetector = require('../../shared/PatternDetector');
const { performance } = require('perf_hooks');

async function runBenchmark() {
    const db = new Database(':memory:');

    // Initialize schema
    db.exec(`
        CREATE TABLE patterns (
            profile_id INTEGER,
            pattern_type TEXT,
            dimension_id INTEGER,
            aspect_id INTEGER,
            confidence REAL,
            strength REAL,
            evidence_count INTEGER,
            impact_score REAL,
            metadata TEXT,
            last_updated DATETIME
        );
        CREATE UNIQUE INDEX idx_patterns_unique_type ON patterns(profile_id, pattern_type) WHERE dimension_id IS NULL AND aspect_id IS NULL;
        CREATE UNIQUE INDEX idx_patterns_unique_aspect ON patterns(profile_id, dimension_id, aspect_id) WHERE dimension_id IS NOT NULL AND aspect_id IS NOT NULL;
    `);

    const detector = new PatternDetector();
    const profileId = 1;

    // Seed with N dimensions to make the O(D^2) loop noticeable
    const N = 200;
    const insertStmt = db.prepare(`
        INSERT INTO patterns (profile_id, pattern_type, dimension_id, aspect_id, confidence, strength, evidence_count, impact_score, last_updated)
        VALUES (?, 'preference', ?, ?, ?, 0.8, 5, 0.5, CURRENT_TIMESTAMP)
    `);

    const runSeeding = db.transaction(() => {
        for (let i = 1; i <= N; i++) {
            // Each dimension has 2 aspects with different confidence
            for (let j = 1; j <= 2; j++) {
                // Dim 1-10: high confidence (synergy likely)
                // Dim 11-200: low confidence (synergy unlikely, good for pruning test)
                const conf = i <= 10 ? (0.8 + Math.random() * 0.2) : (0.1 + Math.random() * 0.3);
                insertStmt.run(profileId, i, j, conf);
            }
        }
    });
    runSeeding();

    console.log(`Seeded ${N} dimensions.`);

    const iterations = 10;
    let totalTime = 0;
    let lastSynergyCount = 0;

    for (let i = 0; i < iterations; i++) {
        // Clear previous synergies to ensure consistent work
        db.prepare("DELETE FROM patterns WHERE pattern_type LIKE 'synergy_%'").run();

        const start = performance.now();
        lastSynergyCount = await detector.detectSynergies(db, profileId);
        const end = performance.now();
        totalTime += (end - start);
    }

    const avgTime = totalTime / iterations;
    console.log(`Average detectSynergies time: ${avgTime.toFixed(2)}ms (${lastSynergyCount} synergies detected)`);
}

runBenchmark().catch(console.error);
