// tests/holistic_audit.js
const { db, initDb } = require('../mobile/src/database/db.js');
const PatternDetector = require('../shared/PatternDetector');
const ValueAlignmentEngine = require('../shared/ValueAlignmentEngine');

const QuestionBankGenerator = require('../shared/QuestionBankGenerator');

async function runAudit() {
    console.log("Starting Holistic Identity Audit...");
    initDb();

    // Seed Dimensions and Aspects
    const generator = new QuestionBankGenerator();
    await generator.populateBank(db);

    const profileId = 1;
    // Clear patterns for audit
    db.prepare("DELETE FROM response_contexts").run();
    db.prepare("DELETE FROM responses").run();
    db.prepare("DELETE FROM patterns").run();
    db.prepare("INSERT OR IGNORE INTO profile (id) VALUES (?)").run(profileId);

    const detector = new PatternDetector();
    const engine = new ValueAlignmentEngine(db);

    // 1. Simulate High Confidence Patterns in multiple dimensions
    // Dimensions: 1 (Values), 2 (Work Style), 3 (Relationships)
    const mockPatterns = [
        { dim: 1, aspect: 1, conf: 0.9, str: 0.8 }, // Values: freedom
        { dim: 2, aspect: 6, conf: 0.85, str: 0.9 }, // Work Style: solo
        { dim: 3, aspect: 11, conf: 0.8, str: 0.85 } // Relationships: trust
    ];

    for (const p of mockPatterns) {
        db.prepare(`
            INSERT INTO patterns (profile_id, pattern_type, dimension_id, aspect_id, confidence, strength, impact_score, last_updated)
            VALUES (?, 'preference', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(profileId, p.dim, p.aspect, p.conf, p.str, p.conf * p.str);
    }

    // 2. Trigger Synergy Detection
    console.log("Detecting synergies...");
    const synergyCount = await detector.detectSynergies(db, profileId);
    console.log(`Detected ${synergyCount} synergies.`);

    // 3. Trigger Privacy Pattern Detection (Sentinel)
    console.log("Detecting privacy patterns...");
    await detector.detectPrivacyPatterns(db, profileId);

    const privacyPattern = db.prepare("SELECT * FROM patterns WHERE pattern_type = 'privacy_sensitivity_high'").get();
    if (privacyPattern) {
        console.log("SENTINEL: Privacy sensitivity detected correctly.");
    }

    // 4. Calculate Holistic Alignment
    console.log("Calculating holistic alignment...");
    const alignment = await engine.calculateHolisticAlignment(profileId);

    console.log("\n--- Audit Results ---");
    console.log(`Score: ${Math.round(alignment.score * 100)}%`);
    console.log(`Interpretation: ${alignment.interpretation}`);
    console.log("Breakdown:", JSON.stringify(alignment.breakdown, null, 2));

    // 5. Verification Logic
    const b = alignment.breakdown;
    const errors = [];

    if (b.synergyDensity <= 0) errors.push("Oracle: Synergy density should be positive.");
    if (b.privacyShieldScore < 0.5) errors.push("Sentinel: Privacy shield score is too low.");
    if (b.coherenceStrategic <= 0) errors.push("Sun Tzu: Strategic coherence should be positive.");
    if (alignment.score < 0.5) errors.push("Overall: Score seems too low for high-confidence data.");

    if (errors.length > 0) {
        console.error("\nAudit FAILED with errors:");
        errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
    } else {
        console.log("\nSUCCESS: Holistic identity audit passed.");
    }
}

runAudit().catch(err => {
    console.error("Audit failed with error:", err);
    process.exit(1);
});
