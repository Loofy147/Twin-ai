// shared/QuestionBankGenerator.js
// Logic from question-generator.tsx.txt

class QuestionBankGenerator {
    constructor() {
        this.dimensions = [
            { name: 'Values', aspects: ['freedom', 'security', 'growth', 'integrity', 'service'] },
            { name: 'Work Style', aspects: ['solo', 'collaborative', 'deep_work', 'multitasking', 'lead'] },
            { name: 'Relationships', aspects: ['trust', 'intimacy', 'loyalty', 'boundaries', 'communication'] },
            { name: 'Learning', aspects: ['science', 'theoretical', 'practical', 'experimental', 'historical'] },
            { name: 'Decision Making', aspects: ['rational', 'intuitive', 'data_driven', 'risk_averse', 'impulsive'] },
            { name: 'Time Management', aspects: ['punctuality', 'flexibility', 'planning', 'spontaneity', 'procrastination'] },
            { name: 'Creativity', aspects: ['innovation', 'expression', 'curiosity', 'abstraction', 'culture'] },
            { name: 'Risk Tolerance', aspects: ['financial', 'social', 'career', 'physical', 'emotional'] },
            { name: 'Communication', aspects: ['direct', 'diplomatic', 'verbal', 'written', 'listening'] },
            { name: 'Physical Environment', aspects: ['minimalism', 'comfort', 'nature', 'urban', 'chaos'] },
            { name: 'Mental State', aspects: ['calm', 'focus', 'anxiety', 'resilience', 'joy'] },
            { name: 'Financial', aspects: ['saving', 'spending', 'investing', 'generosity', 'security'] },
            { name: 'Social', aspects: ['extrovert', 'introvert', 'mentorship', 'networking', 'community'] },
            { name: 'Health', aspects: ['physical_activity', 'nutrition', 'sleep', 'mental_health', 'discipline'] },
            { name: 'Spirituality/Purpose', aspects: ['meaning', 'connection', 'legacy', 'philosophy', 'belief'] }
        ];
    }

    generateStaticQuestions() {
        const questions = [];

        this.dimensions.forEach((dim, dimIdx) => {
            // Generate 300 questions per dimension
            for (let i = 1; i <= 300; i++) {
                const aspect = dim.aspects[i % dim.aspects.length];
                const difficulty = (i % 5) + 1;
                const engagement = 1.0 + (Math.random() * 1.5);

                questions.push({
                    text: `${dim.name} (${aspect}): Assessment Q${i} about your ${aspect.replace('_', ' ')} preferences.`,
                    question_type: i % 2 === 0 ? 'choice' : 'scale',
                    difficulty_level: difficulty,
                    engagement_factor: engagement,
                    primary_dimension_id: dimIdx + 1,
                    metadata: JSON.stringify({
                        aspect: aspect,
                        options: [
                            { text: "Strongly Agree", weight: 1.0, aspect: aspect },
                            { text: "Agree", weight: 0.7, aspect: aspect },
                            { text: "Neutral", weight: 0.5, aspect: 'neutral' },
                            { text: "Disagree", weight: 0.3, aspect: 'opposite' },
                            { text: "Strongly Disagree", weight: 0.1, aspect: 'opposite' },
                            { text: "Don't Care", weight: 0, aspect: 'indifferent' }
                        ]
                    })
                });
            }
        });

        return questions;
    }

    generateTradeOffQuestions() {
        const questions = [];
        for (let i = 0; i < this.dimensions.length; i++) {
            for (let j = i + 1; j < this.dimensions.length; j++) {
                const dim1 = this.dimensions[i];
                const dim2 = this.dimensions[j];
                const aspect1 = dim1.aspects[0];
                const aspect2 = dim2.aspects[0];

                questions.push({
                    text: `Would you sacrifice ${aspect1} (${dim1.name}) for more ${aspect2} (${dim2.name}) in a critical situation?`,
                    question_type: 'trade_off',
                    difficulty_level: 4,
                    engagement_factor: 1.8,
                    primary_dimension_id: i + 1,
                    metadata: JSON.stringify({
                        secondary_dimension_id: j + 1,
                        aspects: [aspect1, aspect2],
                        options: [
                            { text: `Yes, ${aspect2} is more important`, weight: 1.0, aspect: aspect2 },
                            { text: "It depends", weight: 0.5, aspect: 'contextual' },
                            { text: `No, ${aspect1} is non-negotiable`, weight: 1.0, aspect: aspect1 },
                            { text: "Don't Care", weight: 0, aspect: 'indifferent' }
                        ]
                    })
                });
            }
        }
        return questions;
    }

    generateScenarioQuestions() {
        const questions = [];
        const scenarios = [
            { text: "It's 11 PM and you have a deadline tomorrow, but a friend calls in crisis. You:", dimension: 'Relationships', aspect: 'loyalty' },
            { text: "You find a security vulnerability in a company's product. You:", dimension: 'Values', aspect: 'integrity' },
            { text: "You have an extra $5000. You:", dimension: 'Financial', aspect: 'investing' },
            { text: "A colleague takes credit for your work in a meeting. You:", dimension: 'Communication', aspect: 'direct' }
        ];

        scenarios.forEach((s, idx) => {
            const dimIdx = this.dimensions.findIndex(d => d.name === s.dimension);
            questions.push({
                text: `REAL WORLD SCENARIO: ${s.text}`,
                question_type: 'scenario',
                difficulty_level: 3,
                engagement_factor: 2.0,
                primary_dimension_id: dimIdx + 1,
                metadata: JSON.stringify({
                    aspect: s.aspect,
                    options: [
                        { text: "Take immediate action", weight: 1.0, aspect: s.aspect },
                        { text: "Wait and see", weight: 0.4, aspect: 'passive' },
                        { text: "Consult someone", weight: 0.6, aspect: 'collaborative' },
                        { text: "Ignore it", weight: 0.1, aspect: 'avoidance' }
                    ]
                })
            });
        });
        return questions;
    }

    async populateBank(db) {
        const questions = [
            ...this.generateStaticQuestions(),
            ...this.generateTradeOffQuestions(),
            ...this.generateScenarioQuestions()
        ];

        /**
         * BOLT OPTIMIZATION:
         * 1. Wrap the entire operation in a single transaction to avoid per-insert disk syncs (30,000+ writes).
         * 2. Cache aspects in memory to eliminate redundant SELECT queries in the loop.
         * 3. Prepare all statements outside the loop.
         * Expected Impact: Reduction in population time from ~60s to <500ms.
         */
        const populate = db.transaction(() => {
            // 1. Insert Dimensions and Aspects
            const dimStmt = db.prepare("INSERT OR IGNORE INTO dimensions (id, name) VALUES (?, ?)");
            const aspectStmt = db.prepare("INSERT OR IGNORE INTO aspects (dimension_id, name, code) VALUES (?, ?, ?)");

            this.dimensions.forEach((dim, idx) => {
                dimStmt.run(idx + 1, dim.name);
                dim.aspects.forEach((aspectName) => {
                    aspectStmt.run(idx + 1, aspectName, `${dim.name.substring(0,3).toUpperCase()}_${aspectName.toUpperCase()}`);
                });
            });

            // 2. Cache all aspects in memory for O(1) lookup
            const aspectRows = db.prepare("SELECT id, name, dimension_id FROM aspects").all();
            const aspectMap = new Map();
            aspectRows.forEach(row => {
                aspectMap.set(`${row.dimension_id}:${row.name}`, row.id);
            });

            // 3. Prepare Question and Option statements
            const insertStmt = db.prepare(`
                INSERT INTO questions (text, question_type, difficulty_level, engagement_factor, primary_dimension_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const insertOptionStmt = db.prepare(`
                INSERT INTO answer_options (question_id, text, option_order, aspect_id, weight, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            const skipAspects = new Set(['neutral', 'opposite', 'indifferent', 'contextual', 'passive', 'collaborative', 'avoidance']);

            // 4. Batch Insert Questions and Options
            for (const q of questions) {
                const result = insertStmt.run(q.text, q.question_type, q.difficulty_level, q.engagement_factor, q.primary_dimension_id, q.metadata);
                const questionId = result.lastInsertRowid;

                const metadata = JSON.parse(q.metadata);
                if (metadata.options) {
                    metadata.options.forEach((opt, idx) => {
                        let aspectId = null;
                        if (opt.aspect && !skipAspects.has(opt.aspect)) {
                            // FAST LOOKUP: O(1) from map instead of O(log N) from DB SELECT
                            aspectId = aspectMap.get(`${q.primary_dimension_id}:${opt.aspect}`) || null;
                        }

                        insertOptionStmt.run(questionId, opt.text, idx, aspectId, opt.weight, JSON.stringify(opt));
                    });
                }
            }
        });

        // Execute the transaction
        populate();

        return questions.length;
    }
}

module.exports = QuestionBankGenerator;
