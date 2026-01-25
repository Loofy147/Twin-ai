-- supabase/migrations/20260125000002_holistic_alignment.sql
-- Oracle/Midas Optimization: Holistic Alignment Score calculation

BEGIN;

CREATE OR REPLACE FUNCTION get_holistic_alignment(p_profile_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_total_impact REAL;
  v_avg_conf REAL;
  v_dim_count INTEGER;
  v_synergy_count INTEGER;
  v_potential_synergies INTEGER;
  v_synergy_density REAL;
  v_stability_score REAL;
  v_alignment_score REAL;
  v_interpretation TEXT;
BEGIN
  -- 1. MIDAS: Impact and Confidence
  SELECT
    COALESCE(SUM(impact_score), 0),
    COALESCE(AVG(confidence), 0),
    COUNT(DISTINCT dimension_id)
  INTO v_total_impact, v_avg_conf, v_dim_count
  FROM patterns
  WHERE profile_id = p_profile_id AND confidence > 0.3;

  -- 2. ORACLE: Synergy Density
  SELECT COUNT(*) INTO v_synergy_count
  FROM patterns
  WHERE profile_id = p_profile_id AND pattern_type LIKE 'synergy_%';

  IF v_dim_count > 1 THEN
    v_potential_synergies := (v_dim_count * (v_dim_count - 1)) / 2;
    v_synergy_density := v_synergy_count::REAL / v_potential_synergies;
  ELSE
    v_synergy_density := 0;
  END IF;

  -- 3. BOLT: Stability Score
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) / 2592000), 0.5)
  INTO v_stability_score
  FROM patterns
  WHERE profile_id = p_profile_id;

  v_stability_score := LEAST(1.0, v_stability_score);

  -- 4. Unified Alignment Calculation
  v_alignment_score := (
    (v_avg_conf * 0.4) +
    (v_synergy_density * 0.3) +
    (LEAST(1.0, v_total_impact / 50.0) * 0.2) +
    (v_stability_score * 0.1)
  );

  IF v_alignment_score > 0.8 THEN v_interpretation := 'Harmonious';
  ELSIF v_alignment_score > 0.5 THEN v_interpretation := 'Evolving';
  ELSIF v_alignment_score > 0.2 THEN v_interpretation := 'Initializing';
  ELSE v_interpretation := 'Fragmented';
  END IF;

  RETURN jsonb_build_object(
    'score', ROUND(v_alignment_score::numeric, 3),
    'interpretation', v_interpretation,
    'metrics', jsonb_build_object(
      'total_impact', v_total_impact,
      'synergy_density', ROUND(v_synergy_density::numeric, 2),
      'dimension_count', v_dim_count,
      'stability', ROUND(v_stability_score::numeric, 2)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_comprehensive_analytics to include holistic_alignment
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
  v_holistic_alignment JSONB;
BEGIN
  -- IDOR Protection
  IF p_profile_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_cutoff := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

  v_metrics := get_user_metrics(p_profile_id);
  v_holistic_alignment := get_holistic_alignment(p_profile_id);

  -- ... (Rest of the previous implementation remains same, just adding holistic_alignment to the result)
  -- Re-implementing for completeness in the migration

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

  SELECT jsonb_agg(t) INTO v_patterns
  FROM (
    SELECT
      p.id, p.pattern_type, p.confidence, p.strength, p.evidence_count, p.impact_score,
      d.name as dimension_name, a.name as aspect_name, p.last_updated
    FROM patterns p
    LEFT JOIN dimensions d ON d.id = p.dimension_id
    LEFT JOIN aspects a ON a.id = p.aspect_id
    WHERE p.profile_id = p_profile_id AND p.confidence >= 0.6
    ORDER BY p.confidence DESC, p.last_updated DESC
    LIMIT 10
  ) t;

  SELECT jsonb_agg(t) INTO v_knowledge_graph
  FROM (
    SELECT
        dimension_name,
        aspect_name,
        pattern_confidence as confidence,
        pattern_strength as strength,
        impact_score,
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
    'holistic_alignment', v_holistic_alignment,
    'dimension_breakdown', COALESCE(v_dimension_breakdown, '[]'::jsonb),
    'weekly_activity', COALESCE(v_weekly_activity, '[]'::jsonb),
    'patterns', COALESCE(v_patterns, '[]'::jsonb),
    'knowledge_graph', COALESCE(v_knowledge_graph, '[]'::jsonb),
    'timestamp', CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
