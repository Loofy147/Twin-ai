-- ============================================
-- PERSONAL LEARNING SYSTEM - DATABASE SCHEMA
-- ============================================

-- Core Profile: The evolving digital you
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_responses INTEGER DEFAULT 0,
    engagement_score REAL DEFAULT 0.0,
    learning_version INTEGER DEFAULT 1,
    metadata JSON -- Flexible storage for evolving attributes
);

-- Dimensions: Categories for multi-dimensional analysis
CREATE TABLE IF NOT EXISTS dimensions (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'values', 'work_style', 'relationships'
    parent_dimension_id INTEGER REFERENCES dimensions(id),
    weight REAL DEFAULT 1.0, -- Importance weight
    description TEXT,
    metadata JSON
);

-- Aspects: Granular aspects within dimensions
CREATE TABLE IF NOT EXISTS aspects (
    id INTEGER PRIMARY KEY,
    dimension_id INTEGER REFERENCES dimensions(id),
    name VARCHAR(100) NOT NULL, -- e.g., 'freedom', 'security', 'growth'
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'VAL_FREEDOM'
    description TEXT,
    metadata JSON,
    UNIQUE(dimension_id, name)
);

-- Contexts: Environmental and situational factors
CREATE TABLE IF NOT EXISTS contexts (
    id INTEGER PRIMARY KEY,
    context_type VARCHAR(50) NOT NULL, -- 'temporal', 'spatial', 'social', 'mental', 'physical'
    key VARCHAR(100) NOT NULL,
    value VARCHAR(255),
    metadata JSON,
    UNIQUE(context_type, key, value)
);

-- Questions: The question bank with multi-dimensional tags
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id), -- Optional: If NULL, it's a global question
    text TEXT NOT NULL UNIQUE,
    question_type VARCHAR(50), -- 'choice', 'ranking', 'scale', 'binary'
    difficulty_level INTEGER DEFAULT 1, -- 1-5
    engagement_factor REAL DEFAULT 1.0,
    primary_dimension_id INTEGER REFERENCES dimensions(id),
    metadata JSON, -- Tags, related aspects, prerequisites
    active BOOLEAN DEFAULT TRUE,
    times_asked INTEGER DEFAULT 0,
    avg_response_time REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Question Dimensions: Multi-dimensional question mapping
CREATE TABLE IF NOT EXISTS question_dimensions (
    question_id INTEGER REFERENCES questions(id),
    dimension_id INTEGER REFERENCES dimensions(id),
    weight REAL DEFAULT 1.0,
    PRIMARY KEY (question_id, dimension_id)
);

-- Question Aspects: What aspects does this question measure
CREATE TABLE IF NOT EXISTS question_aspects (
    question_id INTEGER REFERENCES questions(id),
    aspect_id INTEGER REFERENCES aspects(id),
    weight REAL DEFAULT 1.0,
    PRIMARY KEY (question_id, aspect_id)
);

-- Answer Options: Possible responses to questions
CREATE TABLE IF NOT EXISTS answer_options (
    id INTEGER PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id),
    text VARCHAR(255) NOT NULL,
    option_order INTEGER,
    aspect_id INTEGER REFERENCES aspects(id), -- What aspect this represents
    weight REAL DEFAULT 1.0,
    metadata JSON
);

-- Responses: User answers - the core dataset
CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    question_id INTEGER REFERENCES questions(id),
    answer_option_id INTEGER REFERENCES answer_options(id),
    response_type VARCHAR(20), -- 'selected', 'dont_care', 'skipped'
    response_time_ms INTEGER,
    confidence_level REAL, -- How certain was the choice (if tracked)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100),
    metadata JSON
);

-- Response Contexts: What context was the response made in
CREATE TABLE IF NOT EXISTS response_contexts (
    response_id INTEGER REFERENCES responses(id),
    context_id INTEGER REFERENCES contexts(id),
    PRIMARY KEY (response_id, context_id)
);

-- Patterns: Detected patterns from responses
CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    pattern_type VARCHAR(50), -- 'preference', 'behavioral', 'temporal', 'contextual'
    dimension_id INTEGER REFERENCES dimensions(id),
    aspect_id INTEGER REFERENCES aspects(id),
    confidence REAL, -- 0.0 to 1.0
    strength REAL, -- How strong is this pattern
    evidence_count INTEGER, -- Number of supporting responses
    impact_score REAL DEFAULT 0.0, -- Calculated value impact (Midas)
    first_detected TIMESTAMP,
    last_updated TIMESTAMP,
    metadata JSON -- Pattern details, conditions, etc.
);

-- Ensure uniqueness for patterns with dimensions/aspects
CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_unique_aspect
ON patterns(profile_id, dimension_id, aspect_id)
WHERE dimension_id IS NOT NULL AND aspect_id IS NOT NULL;

-- Ensure uniqueness for general patterns (like meeting_density)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_unique_type
ON patterns(profile_id, pattern_type)
WHERE dimension_id IS NULL AND aspect_id IS NULL;

-- Relationships: People, projects, entities
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    entity_type VARCHAR(50), -- 'person', 'project', 'job', 'dream', 'hobby', 'place'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    UNIQUE(profile_id, name, entity_type)
);

-- Entity Attributes: How you feel/think about entities
CREATE TABLE IF NOT EXISTS entity_attributes (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    entity_id INTEGER REFERENCES entities(id),
    attribute_type VARCHAR(50), -- 'trust', 'love', 'interest', 'priority', 'status'
    aspect_id INTEGER REFERENCES aspects(id),
    value REAL, -- Numeric value (-1.0 to 1.0 or 0.0 to 1.0)
    text_value VARCHAR(255), -- Text representation
    confidence REAL,
    last_updated TIMESTAMP,
    metadata JSON,
    UNIQUE(profile_id, entity_id, attribute_type)
);

-- Workflows: Task pipelines and methodologies
CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(50), -- 'project', 'habit', 'learning', 'decision'
    status VARCHAR(50), -- 'active', 'paused', 'completed', 'abandoned'
    created_from_responses BOOLEAN DEFAULT FALSE,
    metadata JSON
);

-- Workflow Steps: Specific actions in workflows
CREATE TABLE IF NOT EXISTS workflow_steps (
    id INTEGER PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id),
    step_order INTEGER,
    description TEXT,
    status VARCHAR(50),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSON
);

-- Recommendations: Generated suggestions
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    recommendation_type VARCHAR(50), -- 'action', 'question', 'insight', 'connection'
    title VARCHAR(255),
    description TEXT,
    priority REAL,
    confidence REAL,
    based_on_pattern_ids JSON, -- Array of pattern IDs
    status VARCHAR(50), -- 'pending', 'accepted', 'rejected', 'ignored'
    created_at TIMESTAMP,
    responded_at TIMESTAMP,
    metadata JSON
);

-- Datasets: Custom user datasets
CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    name VARCHAR(255) NOT NULL,
    dataset_type VARCHAR(50), -- 'uploaded', 'generated', 'integrated'
    description TEXT,
    schema_definition JSON,
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata JSON
);

-- Dataset Records: Actual data rows
CREATE TABLE IF NOT EXISTS dataset_records (
    id INTEGER PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id),
    record_data JSON, -- Flexible JSON storage
    created_at TIMESTAMP,
    metadata JSON
);

-- Learning Snapshots: Periodic captures of learned state
CREATE TABLE IF NOT EXISTS learning_snapshots (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER REFERENCES profile(id),
    snapshot_date TIMESTAMP,
    total_responses INTEGER,
    pattern_count INTEGER,
    top_patterns JSON,
    profile_state JSON, -- Complete state at this time
    insights JSON,
    metadata JSON
);

-- ============================================
-- INDEXES for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_responses_profile ON responses(profile_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_created ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id);
CREATE INDEX IF NOT EXISTS idx_patterns_profile ON patterns(profile_id);
CREATE INDEX IF NOT EXISTS idx_patterns_dimension ON patterns(dimension_id);
CREATE INDEX IF NOT EXISTS idx_patterns_aspect ON patterns(aspect_id);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
CREATE INDEX IF NOT EXISTS idx_entity_attrs_profile ON entity_attributes(profile_id);
CREATE INDEX IF NOT EXISTS idx_entity_attrs_entity ON entity_attributes(entity_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_profile ON recommendations(profile_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);

-- TUBER OPTIMIZATION: Multi-tenant isolation and performance indexes
CREATE INDEX IF NOT EXISTS idx_entity_attrs_profile_type ON entity_attributes(profile_id, attribute_type);
CREATE INDEX IF NOT EXISTS idx_workflows_profile_type_status ON workflows(profile_id, workflow_type, status);

-- BOLT OPTIMIZATION: Composite indexes for the question selection engine
CREATE INDEX IF NOT EXISTS idx_questions_active_engagement ON questions(active, engagement_factor DESC);
CREATE INDEX IF NOT EXISTS idx_responses_question_profile ON responses(question_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_questions_profile_active_engagement ON questions(profile_id, active, engagement_factor DESC);

-- BOLT OPTIMIZATION: Additional indexes for common joins and filtering
CREATE INDEX IF NOT EXISTS idx_questions_dimension ON questions(primary_dimension_id);
CREATE INDEX IF NOT EXISTS idx_answer_options_question ON answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_options_aspect ON answer_options(aspect_id);
CREATE INDEX IF NOT EXISTS idx_aspects_dimension ON aspects(dimension_id);
CREATE INDEX IF NOT EXISTS idx_entity_attrs_aspect ON entity_attributes(aspect_id);

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- TUBER: Knowledge Graph View - Expected: Simplifies complex graph joins for UI
DROP VIEW IF EXISTS v_knowledge_graph;
CREATE VIEW v_knowledge_graph AS
SELECT
    p.profile_id,
    d.name as dimension_name,
    a.name as aspect_name,
    p.confidence as pattern_confidence,
    p.strength as pattern_strength,
    e.name as entity_name,
    e.entity_type,
    ea.attribute_type,
    ea.value as attribute_value
FROM patterns p
JOIN aspects a ON p.aspect_id = a.id
JOIN dimensions d ON a.dimension_id = d.id
LEFT JOIN entity_attributes ea ON ea.aspect_id = a.id AND ea.profile_id = p.profile_id
LEFT JOIN entities e ON ea.entity_id = e.id
WHERE p.confidence > 0.3;

-- Current profile state with latest patterns
DROP VIEW IF EXISTS v_current_profile;
CREATE VIEW v_current_profile AS
SELECT
    p.*,
    COUNT(DISTINCT r.id) as total_responses,
    COUNT(DISTINCT pt.id) as active_patterns,
    AVG(CASE WHEN r.response_type = 'dont_care' THEN 0 ELSE 1 END) as engagement_rate
FROM profile p
LEFT JOIN responses r ON r.profile_id = p.id
LEFT JOIN patterns pt ON pt.profile_id = p.id AND pt.confidence > 0.6
GROUP BY p.id;

-- Question effectiveness
DROP VIEW IF EXISTS v_question_performance;
CREATE VIEW v_question_performance AS
SELECT
    q.id,
    q.text,
    q.times_asked,
    COUNT(r.id) as response_count,
    AVG(CASE WHEN r.response_type = 'dont_care' THEN 0 ELSE 1 END) as engagement_rate,
    AVG(r.response_time_ms) as avg_response_time
FROM questions q
LEFT JOIN responses r ON r.question_id = q.id
GROUP BY q.id;

-- Pattern strength by dimension
DROP VIEW IF EXISTS v_dimension_patterns;
CREATE VIEW v_dimension_patterns AS
SELECT
    d.name as dimension,
    a.name as aspect,
    COUNT(p.id) as pattern_count,
    AVG(p.confidence) as avg_confidence,
    AVG(p.strength) as avg_strength
FROM dimensions d
JOIN aspects a ON a.dimension_id = d.id
LEFT JOIN patterns p ON p.aspect_id = a.id
GROUP BY d.id, a.id;
