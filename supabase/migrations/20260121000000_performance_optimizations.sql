-- supabase/migrations/20260121000000_performance_optimizations.sql
-- Performance-focused server-side functions

BEGIN;

/**
 * Get unanswered questions with filtering and pagination handled server-side
 * This is significantly more efficient than fetching all answered IDs to the client
 * and using 'not in' filters.
 */
CREATE OR REPLACE FUNCTION get_unanswered_questions(
  p_profile_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_dimension_id BIGINT DEFAULT NULL,
  p_difficulty INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  text TEXT,
  question_type VARCHAR(50),
  difficulty_level INTEGER,
  primary_dimension_id BIGINT,
  metadata JSONB,
  options JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.text,
    q.question_type,
    q.difficulty_level,
    q.primary_dimension_id,
    q.metadata,
    jsonb_agg(row_to_json(ao.*)) as options
  FROM questions q
  LEFT JOIN answer_options ao ON ao.question_id = q.id
  WHERE q.active = TRUE
    AND (p_dimension_id IS NULL OR q.primary_dimension_id = p_dimension_id)
    AND (p_difficulty IS NULL OR q.difficulty_level = p_difficulty)
    AND NOT EXISTS (
      SELECT 1 FROM responses r
      WHERE r.question_id = q.id
        AND r.profile_id = p_profile_id
    )
  GROUP BY q.id
  ORDER BY q.engagement_factor DESC, q.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Get comprehensive analytics in a single database roundtrip
 * Returns pre-aggregated metrics and breakdown data
 */
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
BEGIN
  v_cutoff := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

  -- 1. Get core metrics (reusing existing logic but bundled)
  v_metrics := get_user_metrics(p_profile_id);

  -- 2. Get dimension breakdown
  SELECT jsonb_agg(t) INTO v_dimension_breakdown
  FROM (
    SELECT
      d.name,
      COUNT(r.id) as count,
      ROUND((COUNT(r.id)::numeric / NULLIF(SUM(COUNT(r.id)) OVER(), 0) * 100), 1) as percentage
    FROM dimensions d
    JOIN questions q ON q.primary_dimension_id = d.id
    JOIN responses r ON r.question_id = q.id
    WHERE r.profile_id = p_profile_id
      AND r.created_at >= v_cutoff
    GROUP BY d.id, d.name
    ORDER BY count DESC
  ) t;

  -- 3. Get weekly activity
  SELECT jsonb_agg(t) INTO v_weekly_activity
  FROM (
    SELECT
      to_char(date_trunc('day', created_at), 'Dy') as day,
      COUNT(*) as responses,
      ROUND(AVG(confidence_level)::numeric * 100, 1) as confidence
    FROM responses
    WHERE profile_id = p_profile_id
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY date_trunc('day', created_at)
    ORDER BY date_trunc('day', created_at)
  ) t;

  RETURN jsonb_build_object(
    'metrics', v_metrics,
    'dimension_breakdown', COALESCE(v_dimension_breakdown, '[]'::jsonb),
    'weekly_activity', COALESCE(v_weekly_activity, '[]'::jsonb),
    'timestamp', CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
