-- supabase/migrations/20260125000001_add_impact_score.sql
-- Midas Optimization: Add impact_score to track pattern value

BEGIN;

ALTER TABLE patterns ADD COLUMN IF NOT EXISTS impact_score REAL DEFAULT 0.0;

-- Backfill impact_score for existing patterns
UPDATE patterns SET impact_score = confidence * strength WHERE impact_score = 0.0;

-- Update v_knowledge_graph to include impact_score
DROP VIEW IF EXISTS v_knowledge_graph;
CREATE VIEW v_knowledge_graph AS
SELECT
    p.profile_id,
    d.name as dimension_name,
    a.name as aspect_name,
    p.confidence as pattern_confidence,
    p.strength as pattern_strength,
    p.impact_score,
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

COMMIT;
