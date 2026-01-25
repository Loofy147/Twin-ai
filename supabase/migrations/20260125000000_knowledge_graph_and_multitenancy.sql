-- supabase/migrations/20260125000000_knowledge_graph_and_multitenancy.sql
-- Knowledge Graph view, multi-tenancy for workflows, and enhanced analytics RPC

BEGIN;

-- 1. Multi-tenancy for workflows
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS profile_id TEXT REFERENCES profile(id);
-- Index for multi-tenant workflow queries
CREATE INDEX IF NOT EXISTS idx_workflows_profile ON workflows(profile_id);

-- 2. Knowledge Graph View (Supabase version)
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

-- 3. Update get_comprehensive_analytics RPC to include knowledge_graph
CREATE OR REPLACE FUNCTION get_comprehensive_analytics(
  p_profile_id TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_metrics JSONB;
  v_dimension_breakdown JSONB;
  v_weekly_activity JSONB;
  v_patterns JSONB;
  v_knowledge_graph JSONB;
BEGIN
  -- IDOR Protection: Ensure user can only access their own data
  IF p_profile_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Unauthorized: Profile ID mismatch';
  END IF;

  v_cutoff := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

  -- 1. Core Metrics
  v_metrics := get_user_metrics(p_profile_id);

  -- 2. Enhanced Dimension Breakdown
  SELECT jsonb_agg(t) INTO v_dimension_breakdown
  FROM (
    WITH all_dim_responses AS (
      SELECT d.id, d.name, r.id as response_id
      FROM dimensions d
      JOIN question_dimensions qd ON qd.dimension_id = d.id
      JOIN responses r ON r.question_id = qd.question_id
      WHERE r.profile_id = p_profile_id AND r.created_at >= v_cutoff
      UNION ALL
      SELECT d.id, d.name, r.id as response_id
      FROM dimensions d
      JOIN questions q ON q.primary_dimension_id = d.id
      JOIN responses r ON r.question_id = q.id
      WHERE r.profile_id = p_profile_id AND r.created_at >= v_cutoff
        AND NOT EXISTS (SELECT 1 FROM question_dimensions qd WHERE qd.question_id = q.id)
    )
    SELECT
      name,
      COUNT(DISTINCT response_id) as count,
      ROUND((COUNT(DISTINCT response_id)::numeric / NULLIF(SUM(COUNT(DISTINCT response_id)) OVER(), 0) * 100), 1) as percentage
    FROM all_dim_responses
    GROUP BY id, name
    ORDER BY count DESC
  ) t;

  -- 3. Weekly Activity
  SELECT jsonb_agg(t) INTO v_weekly_activity
  FROM (
    SELECT
      to_char(d, 'Dy') as day,
      COALESCE(COUNT(r.id), 0) as responses,
      COALESCE(ROUND(AVG(r.confidence_level)::numeric * 100, 1), 0) as confidence
    FROM generate_series(
      CURRENT_DATE - INTERVAL '6 days',
      CURRENT_DATE,
      '1 day'::interval
    ) d
    LEFT JOIN responses r ON date_trunc('day', r.created_at) = d AND r.profile_id = p_profile_id
    GROUP BY d
    ORDER BY d
  ) t;

  -- 4. Joined Patterns
  SELECT jsonb_agg(t) INTO v_patterns
  FROM (
    SELECT
      p.id, p.pattern_type, p.confidence, p.strength, p.evidence_count,
      d.name as dimension_name, a.name as aspect_name, p.last_updated
    FROM patterns p
    LEFT JOIN dimensions d ON d.id = p.dimension_id
    LEFT JOIN aspects a ON a.id = p.aspect_id
    WHERE p.profile_id = p_profile_id AND p.confidence >= 0.6
    ORDER BY p.confidence DESC, p.last_updated DESC
    LIMIT 10
  ) t;

  -- 5. Knowledge Graph (New Bolt Optimization)
  SELECT jsonb_agg(t) INTO v_knowledge_graph
  FROM (
    SELECT
        dimension_name,
        aspect_name,
        pattern_confidence as confidence,
        pattern_strength as strength,
        entity_name,
        entity_type,
        attribute_type,
        attribute_value as value
    FROM v_knowledge_graph
    WHERE profile_id = p_profile_id
    LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'metrics', v_metrics,
    'dimension_breakdown', COALESCE(v_dimension_breakdown, '[]'::jsonb),
    'weekly_activity', COALESCE(v_weekly_activity, '[]'::jsonb),
    'patterns', COALESCE(v_patterns, '[]'::jsonb),
    'knowledge_graph', COALESCE(v_knowledge_graph, '[]'::jsonb),
    'timestamp', CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
