// shared/QuestionBankGenerator.js
// Logic from question-generator.tsx.txt

class QuestionBankGenerator {
    constructor() {
        this.dimensions = [
            'Values', 'Work Style', 'Relationships', 'Learning', 'Decision Making',
            'Time Management', 'Creativity', 'Risk Tolerance', 'Communication',
            'Physical Environment', 'Mental State', 'Financial', 'Social',
            'Health', 'Spirituality/Purpose'
        ];
    }

    generateStaticQuestions() {
        const questions = [];

        this.dimensions.forEach((dim, dimIdx) => {
            // Generate 334 questions per dimension for a total of 5010 questions
            for (let i = 1; i <= 334; i++) {
                const difficulty = (i % 5) + 1;
                const engagement = 1.0 + (Math.random() * 1.5);

                questions.push({
                    text: `${dim} - Assessment Q${i}: Analysis of your personal ${dim.toLowerCase()} patterns.`,
                    question_type: i % 3 === 0 ? 'ranking' : (i % 2 === 0 ? 'choice' : 'scale'),
                    difficulty_level: difficulty,
                    engagement_factor: engagement,
                    primary_dimension_id: dimIdx + 1,
                    metadata: JSON.stringify({
                        options: [
                            { text: "Option 1", weight: 1.0 },
                            { text: "Option 2", weight: 0.8 },
                            { text: "Option 3", weight: 0.5 },
                            { text: "Option 4", weight: 0.2 },
                            { text: "Don't Care", weight: 0 }
                        ],
                        tags: [dim.toLowerCase(), `level_${difficulty}`]
                    })
                });
            }
        });

        return questions;
    }

    async populateBank(db) {
        const questions = this.generateStaticQuestions();

        this.dimensions.forEach((name, idx) => {
            db.prepare("INSERT OR IGNORE INTO dimensions (id, name) VALUES (?, ?)").run(idx + 1, name);
        });

        const insertStmt = db.prepare(`
            INSERT INTO questions (text, question_type, difficulty_level, engagement_factor, primary_dimension_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Batch insert for performance if supported, but here we'll just loop
        for (const q of questions) {
            insertStmt.run(q.text, q.question_type, q.difficulty_level, q.engagement_factor, q.primary_dimension_id, q.metadata);
        }

        return questions.length;
    }
}

module.exports = QuestionBankGenerator;
