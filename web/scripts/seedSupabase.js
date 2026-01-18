const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const QuestionBankGenerator = require('../../shared/QuestionBankGenerator');

// Simple .env loader
const envPath = path.join(__dirname, '../.env');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials in web/.env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
    console.log("Starting Supabase seeding...");

    const generator = new QuestionBankGenerator();
    const dimensions = generator.dimensions;
    const questions = [
        ...generator.generateStaticQuestions(),
        ...generator.generateTradeOffQuestions(),
        ...generator.generateScenarioQuestions()
    ];

    // 1. Seed Profile
    console.log("Seeding profile...");
    await supabase.from('profile').upsert({ id: 1 });

    // 2. Seed Dimensions
    console.log("Seeding dimensions...");
    for (let i = 0; i < dimensions.length; i++) {
        const { error } = await supabase.from('dimensions').upsert({
            id: i + 1,
            name: dimensions[i].name
        });
        if (error) console.error(`Error seeding dimension ${dimensions[i].name}:`, error);
    }

    // 3. Seed Aspects
    console.log("Seeding aspects...");
    for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i];
        for (const aspectName of dim.aspects) {
            const { error } = await supabase.from('aspects').upsert({
                dimension_id: i + 1,
                name: aspectName,
                code: `${dim.name.substring(0,3).toUpperCase()}_${aspectName.toUpperCase()}`
            });
            if (error) console.error(`Error seeding aspect ${aspectName}:`, error);
        }
    }

    // 4. Seed Questions and Answer Options
    console.log(`Seeding ${questions.length} questions...`);
    // Note: This is simplified. In a real scenario, we might want to batch these.
    for (const q of questions) {
        const { data: qData, error: qError } = await supabase.from('questions').upsert({
            text: q.text,
            question_type: q.question_type,
            difficulty_level: q.difficulty_level,
            engagement_factor: q.engagement_factor,
            primary_dimension_id: q.primary_dimension_id,
            metadata: JSON.parse(q.metadata)
        }).select();

        if (qError) {
            if (qError.code !== '23505') { // Ignore unique constraint violations
                console.error(`Error seeding question: ${q.text.substring(0, 50)}...`, qError);
            }
            continue;
        }

        const questionId = qData[0].id;
        const metadata = JSON.parse(q.metadata);

        if (metadata.options) {
            for (let idx = 0; idx < metadata.options.length; idx++) {
                const opt = metadata.options[idx];
                let aspectId = null;

                if (opt.aspect && !['neutral', 'opposite', 'indifferent', 'contextual'].includes(opt.aspect)) {
                    const { data: aData } = await supabase.from('aspects')
                        .select('id')
                        .eq('name', opt.aspect)
                        .eq('dimension_id', q.primary_dimension_id)
                        .single();
                    aspectId = aData ? aData.id : null;
                }

                await supabase.from('answer_options').upsert({
                    question_id: questionId,
                    text: opt.text,
                    option_order: idx,
                    aspect_id: aspectId,
                    weight: opt.weight,
                    metadata: opt
                });
            }
        }
    }

    console.log("Seeding completed!");
}

seed().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
