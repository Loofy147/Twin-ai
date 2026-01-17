# Personal Learning System - Complete Implementation Roadmap

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Frontend (React + Storage)             │
│  - Question UI                                   │
│  - Insights Dashboard                            │
│  - Data Visualization                            │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│        Question Selection Engine                 │
│  - Adaptive algorithm (no AI needed)             │
│  - Context-aware selection                       │
│  - Engagement optimization                       │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│         Response Pipeline                        │
│  - Capture + Context                             │
│  - Pattern Detection                             │
│  - Profile Update                                │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│           Database (SQLite/Supabase)             │
│  - 5000+ pre-generated questions                 │
│  - All responses with contexts                   │
│  - Detected patterns                             │
│  - Learned profile                               │
└──────────────────────────────────────────────────┘
```

## Phase 1: Setup (Day 1)

### 1.1 Database Setup

**Option A: Local SQLite (Free, Simple)**
```bash
# Install dependencies
npm install better-sqlite3
```

**Option B: Supabase (Free tier, Cloud)**
```bash
# Create Supabase project at supabase.com
# Run the SQL schema from the database artifact
# Get API keys
npm install @supabase/supabase-js
```

### 1.2 Generate Question Bank

1. Run the Question Bank Generator artifact
2. Click "Generate Question Bank"
3. Download the JSON file
4. Import into database:

```javascript
// Import questions to database
const questions = JSON.parse(questionBankJSON);

questions.forEach(q => {
  db.run(`
    INSERT INTO questions (
      id, text, question_type, difficulty_level,
      engagement_factor, primary_dimension_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    q.id,
    q.text,
    q.type,
    q.difficulty,
    q.engagement_factor,
    getDimensionId(q.primary_dimension),
    JSON.stringify({
      aspects: q.aspects,
      tags: q.tags,
      context: q.context,
      options: q.options
    })
  ]);
});
```

## Phase 2: Core System (Days 2-3)

### 2.1 Question Selection Engine

```javascript
// adaptive-question-selector.js
class QuestionSelector {
  constructor(db, profileId) {
    this.db = db;
    this.profileId = profileId;
    this.currentContext = this.getCurrentContext();
  }

  getCurrentContext() {
    const hour = new Date().getHours();
    const day = new Date().getDay();

    return {
      temporal: {
        hour,
        day,
        timeOfDay: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
      },
      // Add spatial, mental state etc. as you collect data
    };
  }

  async selectNextQuestion() {
    // Get recent questions to avoid repetition
    const recentQuestions = await this.getRecentQuestions(20);

    // Get profile state
    const profile = await this.getProfile();

    // Get candidate questions
    const candidates = await this.getCandidateQuestions({
      excludeIds: recentQuestions.map(q => q.id),
      active: true
    });

    // Score each candidate
    const scored = candidates.map(q => ({
      question: q,
      score: this.calculateQuestionScore(q, profile)
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Pick from top 10 with weighted randomness
    const top10 = scored.slice(0, 10);
    const selected = this.weightedRandomPick(top10);

    return selected.question;
  }

  calculateQuestionScore(question, profile) {
    let score = 0;

    // 1. Dimension Coverage (25%)
    const dimensionCoverage = profile.dimensionCoverage[question.primary_dimension] || 0;
    score += (1 - dimensionCoverage) * 0.25;

    // 2. Pattern Refinement (30%)
    const hasWeakPatterns = this.hasWeakPatterns(question.primary_dimension, profile);
    if (hasWeakPatterns) score += 0.3;

    // 3. Context Relevance (20%)
    if (this.isContextuallyRelevant(question)) score += 0.2;

    // 4. Engagement Factor (15%)
    score += (question.engagement_factor - 1) * 0.15;

    // 5. Difficulty Progression (10%)
    if (this.isAppropiateDifficulty(question, profile)) score += 0.1;

    return score;
  }

  isContextuallyRelevant(question) {
    const { timeOfDay } = this.currentContext.temporal;

    // Morning: values, work
    if (timeOfDay === 'morning') {
      return ['values', 'work_style', 'time_management'].includes(
        question.primary_dimension
      );
    }

    // Afternoon: work, decision making
    if (timeOfDay === 'afternoon') {
      return ['work_style', 'decision_making', 'learning'].includes(
        question.primary_dimension
      );
    }

    // Evening: life, relationships, purpose
    return ['relationships', 'health', 'purpose', 'social'].includes(
      question.primary_dimension
    );
  }

  weightedRandomPick(scoredQuestions) {
    const totalScore = scoredQuestions.reduce((sum, sq) => sum + sq.score, 0);
    let random = Math.random() * totalScore;

    for (const sq of scoredQuestions) {
      random -= sq.score;
      if (random <= 0) return sq;
    }

    return scoredQuestions[0];
  }
}
```

### 2.2 Response Pipeline

```javascript
// response-pipeline.js
class ResponsePipeline {
  async processResponse(responseData) {
    const {
      questionId,
      answerOptionId,
      responseType,
      responseTimeMs
    } = responseData;

    // 1. CAPTURE: Store with full context
    const responseId = await this.storeResponse({
      questionId,
      answerOptionId,
      responseType,
      responseTimeMs,
      contexts: this.captureContexts(),
      sessionId: this.currentSessionId,
      timestamp: Date.now()
    });

    // 2. IMMEDIATE UPDATES
    await this.updateAspectScores(responseId);
    await this.updateDimensionCoverage(questionId);

    // 3. PATTERN DETECTION (run periodically, not every response)
    if (this.shouldRunPatternDetection()) {
      await this.detectPatterns();
    }

    // 4. WORKFLOW TRIGGERS
    await this.checkWorkflowTriggers(responseId);

    // 5. GENERATE INSIGHTS (if enough data)
    if (this.totalResponses % 50 === 0) {
      await this.generateInsights();
    }

    return { success: true, responseId };
  }

  captureContexts() {
    const now = new Date();

    return {
      temporal: {
        hour: now.getHours(),
        day: now.getDay(),
        date: now.toISOString(),
        timeOfDay: this.getTimeOfDay(now.getHours())
      },
      // Add more contexts as you collect them:
      // spatial: { location, environment }
      // mental: { mood, energy }
      // social: { alone, with_others }
    };
  }

  async updateAspectScores(responseId) {
    // Get the response details
    const response = await this.getResponse(responseId);
    const question = await this.getQuestion(response.questionId);
    const answer = await this.getAnswerOption(response.answerOptionId);

    // Update aspect scores based on answer weight
    if (answer.aspect_id) {
      await this.db.run(`
        INSERT INTO entity_attributes (
          profile_id, entity_id, attribute_type,
          aspect_id, value, confidence, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (profile_id, entity_id, attribute_type, aspect_id)
        DO UPDATE SET
          value = (value * 0.9) + (? * 0.1),
          confidence = MIN(confidence + 0.05, 1.0),
          last_updated = ?
      `, [
        this.profileId,
        null, // entity_id for self
        'preference',
        answer.aspect_id,
        answer.weight,
        0.5, // initial confidence
        Date.now(),
        answer.weight,
        Date.now()
      ]);
    }
  }
}
```

### 2.3 Pattern Detection

```javascript
// pattern-detector.js
class PatternDetector {
  async detectPatterns(profileId, lookbackDays = 30) {
    const patterns = [];

    // 1. DIRECT PREFERENCES
    const directPatterns = await this.detectDirectPreferences(
      profileId,
      lookbackDays
    );
    patterns.push(...directPatterns);

    // 2. CONTEXTUAL PATTERNS
    const contextualPatterns = await this.detectContextualPatterns(
      profileId,
      lookbackDays
    );
    patterns.push(...contextualPatterns);

    // 3. TEMPORAL PATTERNS
    const temporalPatterns = await this.detectTemporalPatterns(
      profileId,
      lookbackDays
    );
    patterns.push(...temporalPatterns);

    // Store all patterns
    for (const pattern of patterns) {
      if (pattern.confidence > 0.6) {
        await this.storePattern(pattern);
      }
    }

    return patterns;
  }

  async detectDirectPreferences(profileId, lookbackDays) {
    // "User always chooses Freedom over Security"
    const query = `
      SELECT
        q.primary_dimension_id,
        ao.aspect_id,
        COUNT(*) as count,
        AVG(ao.weight) as avg_weight
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      JOIN answer_options ao ON r.answer_option_id = ao.id
      WHERE r.profile_id = ?
        AND r.created_at > datetime('now', '-' || ? || ' days')
        AND r.response_type = 'selected'
      GROUP BY q.primary_dimension_id, ao.aspect_id
      HAVING count >= 3
    `;

    const results = await this.db.all(query, [profileId, lookbackDays]);

    return results.map(r => ({
      type: 'direct_preference',
      dimensionId: r.primary_dimension_id,
      aspectId: r.aspect_id,
      confidence: Math.min(r.count / 10, 1.0), // Max confidence at 10 occurrences
      strength: r.avg_weight,
      evidenceCount: r.count
    }));
  }

  async detectContextualPatterns(profileId, lookbackDays) {
    // "In morning, chooses Focus; in evening, chooses Relax"
    const query = `
      SELECT
        q.primary_dimension_id,
        ao.aspect_id,
        json_extract(rc.context_data, '$.temporal.timeOfDay') as time_of_day,
        COUNT(*) as count,
        AVG(ao.weight) as avg_weight
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      JOIN answer_options ao ON r.answer_option_id = ao.id
      JOIN response_contexts rc ON r.id = rc.response_id
      WHERE r.profile_id = ?
        AND r.created_at > datetime('now', '-' || ? || ' days')
        AND r.response_type = 'selected'
      GROUP BY q.primary_dimension_id, ao.aspect_id, time_of_day
      HAVING count >= 2
    `;

    const results = await this.db.all(query, [profileId, lookbackDays]);

    // Find patterns where context matters
    const grouped = {};
    results.forEach(r => {
      const key = `${r.primary_dimension_id}_${r.aspect_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const patterns = [];
    Object.values(grouped).forEach(group => {
      if (group.length > 1) {
        // Context matters for this aspect
        patterns.push({
          type: 'contextual',
          dimensionId: group[0].primary_dimension_id,
          aspectId: group[0].aspect_id,
          contexts: group.map(g => ({
            context: g.time_of_day,
            weight: g.avg_weight,
            count: g.count
          })),
          confidence: 0.7,
          strength: 0.8
        });
      }
    });

    return patterns;
  }
}
```

## Phase 3: Agent Environment (Days 4-5)

### 3.1 Environment Preparation

```javascript
// environment-builder.js
class EnvironmentBuilder {
  async buildEnvironment(profileId) {
    const patterns = await this.loadPatterns(profileId);
    const responses = await this.loadAllResponses(profileId);

    const environment = {
      identity: await this.buildIdentityProfile(patterns),
      preferences: await this.buildPreferenceHierarchy(patterns),
      contexts: await this.buildContextualPreferences(patterns),
      relationships: await this.buildRelationshipMap(patterns),
      constraints: await this.extractConstraints(patterns),
      workflows: await this.generateWorkflows(patterns),
      decisionFramework: await this.buildDecisionFramework(patterns)
    };

    return environment;
  }

  async buildIdentityProfile(patterns) {
    // Who you are based on consistent patterns
    const identity = {};

    for (const dimension of DIMENSIONS) {
      const dimPatterns = patterns.filter(p =>
        p.dimension_id === dimension.id && p.confidence > 0.7
      );

      if (dimPatterns.length > 0) {
        identity[dimension.name] = {
          topAspects: this.getTopAspects(dimPatterns, 3),
          confidence: this.avgConfidence(dimPatterns),
          description: this.generateDescription(dimPatterns)
        };
      }
    }

    return identity;
  }

  async buildPreferenceHierarchy(patterns) {
    // What matters most → least
    const allAspects = this.extractAllAspects(patterns);

    // Score each aspect
    const scored = allAspects.map(aspect => ({
      aspect,
      score: this.calculateAspectImportance(aspect, patterns)
    }));

    // Sort by importance
    scored.sort((a, b) => b.score - a.score);

    return {
      hierarchy: scored,
      topValues: scored.slice(0, 5),
      distribution: this.calculateDistribution(scored)
    };
  }

  async buildDecisionFramework(patterns) {
    // How to make decisions based on your values
    return {
      approach: this.determineDecisionStyle(patterns),
      priorities: this.extractPriorities(patterns),
      tradeoffs: this.identifyCommonTradeoffs(patterns),
      rules: this.generateDecisionRules(patterns)
    };
  }
}
```

## Phase 4: Cost Optimization

### 4.1 No AI Costs Strategy

**All processing is rule-based algorithms:**
- ✅ Question selection: Smart scoring algorithm (free)
- ✅ Pattern detection: SQL queries + statistics (free)
- ✅ Insights generation: Template-based (free)
- ✅ Recommendations: Rule engine (free)

**Only use AI when:**
- User explicitly requests AI analysis
- Exporting insights as natural language report
- Complex cross-dimensional reasoning needed

**Cost estimate:**
- Setup: $0 (if using free tier Supabase or local SQLite)
- Running: $0/month for pure algorithmic processing
- Optional AI features: ~$1-5/month if used sparingly

### 4.2 Data Export Strategy

```javascript
// Export your complete dataset anytime
async function exportCompleteDataset(profileId) {
  return {
    profile: await getProfile(profileId),
    responses: await getAllResponses(profileId),
    patterns: await getAllPatterns(profileId),
    environment: await buildEnvironment(profileId),
    insights: await generateInsights(profileId),
    timestamp: Date.now()
  };
}
```

## Phase 5: Expansion (Ongoing)

### 5.1 Add Custom Datasets

```javascript
// Upload your own datasets
async function importCustomDataset(name, data, schema) {
  const datasetId = await db.run(`
    INSERT INTO datasets (profile_id, name, dataset_type, schema_definition)
    VALUES (?, ?, 'uploaded', ?)
  `, [profileId, name, JSON.stringify(schema)]);

  // Import records
  for (const record of data) {
    await db.run(`
      INSERT INTO dataset_records (dataset_id, record_data)
      VALUES (?, ?)
    `, [datasetId, JSON.stringify(record)]);
  }
}
```

### 5.2 Connect External Data

```javascript
// Integrate calendars, location, health data, etc.
async function integrateExternalData(source, data) {
  // Process and store as contexts or datasets
  await processExternalSource(source, data);

  // Rerun pattern detection with new data
  await detectPatterns(profileId);
}
```

## Summary: Total Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| Database | $0 | Free tier Supabase or local SQLite |
| Question Bank | $0 | One-time generation |
| Algorithms | $0 | Pure JavaScript/SQL |
| Hosting | $0 | Vercel/Netlify free tier |
| Storage | $0 | 500MB free on Supabase |
| **Optional AI** | $1-5/mo | Only if you want AI-generated insights |

**Total: $0/month for core system**