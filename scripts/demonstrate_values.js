// scripts/demonstrate_values.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const ValueAlignmentEngine = require('../shared/ValueAlignmentEngine');
const PatternDetector = require('../shared/PatternDetector');

// Initialize in-memory database
const db = new Database(':memory:');

// 1. Setup Schema (Tuber)
console.log("🔧 TUBER: Initializing Database Bedrock...");
const schemaPath = path.join(__dirname, '../mobile/src/database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// 2. Seed Data (Midas/Sun-tzu)
console.log("💰 MIDAS: Seeding Growth Data...");
const profileId = 1;
db.prepare("INSERT INTO profile (id) VALUES (?)").run(profileId);

// Add Dimensions
const dimensions = [
    ['Values', 'Core philosophical drivers'],
    ['Work Style', 'How you get things done'],
    ['Relationships', 'Connection patterns']
];
const dimInsert = db.prepare("INSERT INTO dimensions (name, description) VALUES (?, ?)");
dimensions.forEach(d => dimInsert.run(d[0], d[1]));

// Add Aspects
const aspects = [
    [1, 'Freedom', 'VAL_FREEDOM'],
    [2, 'Deep Work', 'WOR_DEEP_WORK'],
    [3, 'Trust', 'REL_TRUST']
];
const aspectInsert = db.prepare("INSERT INTO aspects (dimension_id, name, code) VALUES (?, ?, ?)");
aspects.forEach(a => aspectInsert.run(a[0], a[1], a[2]));

// Add Patterns with Impact Scores
const patternInsert = db.prepare(`
    INSERT INTO patterns (profile_id, pattern_type, dimension_id, aspect_id, confidence, strength, impact_score, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

patternInsert.run(profileId, 'preference', 1, 1, 0.95, 0.9, 15.2, oneMonthAgo); // Values: Freedom
patternInsert.run(profileId, 'preference', 2, 2, 0.88, 0.92, 12.5, oneMonthAgo); // Work Style: Deep Work
patternInsert.run(profileId, 'preference', 3, 3, 0.92, 0.85, 10.8, oneMonthAgo); // Relationships: Trust

// Add Synergies (Oracle)
const synergyInsert = db.prepare(`
    INSERT INTO patterns (profile_id, pattern_type, metadata, confidence, strength, impact_score, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);
synergyInsert.run(
    profileId,
    'synergy_dimension_alignment_1_2',
    JSON.stringify({ dim1: 1, dim2: 2, alignment: 0.91 }),
    0.91, 0.91, 5.5, oneMonthAgo
);
synergyInsert.run(
    profileId,
    'synergy_dimension_alignment_2_3',
    JSON.stringify({ dim2: 2, dim3: 3, alignment: 0.85 }),
    0.85, 0.85, 4.2, oneMonthAgo
);
synergyInsert.run(
    profileId,
    'synergy_dimension_alignment_1_3',
    JSON.stringify({ dim1: 1, dim3: 3, alignment: 0.88 }),
    0.88, 0.88, 4.8, oneMonthAgo
);

// 3. Execute Alignment Engine (The Council)
console.log("🔮 ORACLE: Synthesizing Holistic Alignment...");
const engine = new ValueAlignmentEngine(db);

async function runDemo() {
    const alignment = await engine.calculateHolisticAlignment(profileId);

    console.log("\n" + "=".repeat(50));
    console.log("⚡ TWIN-AI: HOLISTIC VALUE STRUCTURE OUTPUT");
    console.log("=".repeat(50));
    console.log(`STATUS: ${alignment.interpretation}`);
    console.log(`SCORE:  ${(alignment.score * 100).toFixed(1)}% Alignment`);
    console.log("-".repeat(50));

    console.log("📊 MULTI-DIMENSIONAL BREAKDOWN:");
    console.log(`- Confidence (Oracle):   ${(alignment.breakdown.confidenceAverage * 100).toFixed(1)}%`);
    console.log(`- Synergy Density (Sun-tzu): ${(alignment.breakdown.synergyDensity * 100).toFixed(1)}%`);
    console.log(`- Total Impact (Midas):   ${alignment.breakdown.totalImpact.toFixed(2)} Points`);
    console.log(`- Stability (Bolt):      ${(alignment.breakdown.stabilityScore * 100).toFixed(1)}%`);
    console.log(`- Active Dimensions (Tuber): ${alignment.breakdown.dimensionCount}`);

    console.log("\n🎨 PALETTE: Perspective-Dependent Vision");
    console.log("The twin perceives a strong bridge between your 'Values' and 'Work Style'.");
    console.log("This alignment is temporally dynamic and ready for 3D mapping.");
    console.log("=".repeat(50));
}

runDemo();
