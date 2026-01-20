-- supabase/migrations/20260122000000_advanced_optimizations.sql
-- Advanced Performance & Robustness Optimizations

BEGIN;

/**
 * Atomic submission of a question response with integrated rate limiting and metrics return
 * This reduces network roundtrips from 2-3 down to 1.
 */
CREATE OR REPLACE FUNCTION submit_response_atomic(
  p_profile_id TEXT,
  p_question_id BIGINT,
  p_answer_option_id BIGINT,
  p_response_time_ms INTEGER,
  p_confidence_level DOUBLE PRECISION,
  p_response_type VARCHAR(20) DEFAULT 'selected'
)
RETURNS JSONB AS $$
DECLARE
  v_allowed BOOLEAN;
  v_new_metrics JSONB;
BEGIN
  -- 1. Enforce rate limit (120 questions per hour)
  -- Uses the existing check_rate_limit function from 20260119000001
  SELECT check_rate_limit(p_profile_id, 'questions_per_hour', 120, 60) INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded'
    );
  END IF;

  -- 2. Insert the response
  INSERT INTO responses (
    profile_id,
    question_id,
    answer_option_id,
    response_time_ms,
    confidence_level,
    response_type,
    created_at
  ) VALUES (
    p_profile_id,
    p_question_id,
    p_answer_option_id,
    p_response_time_ms,
    p_confidence_level,
    p_response_type,
    CURRENT_TIMESTAMP
  );

  -- 3. Atomically update profile response count
  UPDATE profile
  SET total_responses = total_responses + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_profile_id;

  -- 4. Log audit event
  PERFORM log_audit_event(
    p_profile_id,
    'question_answered',
    'question',
    p_question_id::text,
    jsonb_build_object('answer_option_id', p_answer_option_id)
  );

  -- 5. Calculate and return updated metrics in same roundtrip
  v_new_metrics := get_user_metrics(p_profile_id);

  RETURN jsonb_build_object(
    'success', true,
    'metrics', v_new_metrics
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Enhanced unanswered questions RPC with Adaptive Selection logic
 * Prioritizes dimensions where the user has fewer responses.
 */
CREATE OR REPLACE FUNCTION get_unanswered_questions_adaptive(
  p_profile_id TEXT,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_dimension_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  text TEXT,
  question_type VARCHAR(50),
  difficulty_level INTEGER,
  primary_dimension_id BIGINT,
  metadata JSONB,
  options JSONB,
  selection_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH user_dimension_coverage AS (
    -- Calculate coverage for each dimension for this specific user
    SELECT
      d.id as dim_id,
      COUNT(r.id) as response_count
    FROM dimensions d
    LEFT JOIN questions q ON q.primary_dimension_id = d.id
    LEFT JOIN responses r ON r.question_id = q.id AND r.profile_id = p_profile_id
    GROUP BY d.id
  )
  SELECT
    q.id,
    q.text,
    q.question_type,
    q.difficulty_level,
    q.primary_dimension_id,
    q.metadata,
    jsonb_agg(row_to_json(ao.*)) as options,
    -- Adaptive scoring logic ported from mobile
    (
      (1.0 / (COALESCE(udc.response_count, 0) + 1.0) * 0.4) -- Coverage factor
      + (q.engagement_factor * 0.2)                        -- Engagement factor
      + (random() * 0.1)                                   -- Jitter
    ) as selection_score
  FROM questions q
  LEFT JOIN answer_options ao ON ao.question_id = q.id
  LEFT JOIN user_dimension_coverage udc ON udc.dim_id = q.primary_dimension_id
  WHERE q.active = TRUE
    AND (p_dimension_id IS NULL OR q.primary_dimension_id = p_dimension_id)
    AND NOT EXISTS (
      SELECT 1 FROM responses r
      WHERE r.question_id = q.id
        AND r.profile_id = p_profile_id
    )
  GROUP BY q.id, udc.response_count
  ORDER BY selection_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
