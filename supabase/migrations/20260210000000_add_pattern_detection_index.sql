-- supabase/migrations/20260210000000_add_pattern_detection_index.sql
-- BOLT OPTIMIZATION: High-impact covering index for pattern detection
-- This index optimizes the join between responses, answer_options, and aspects
-- by covering all columns used in the analyzeResponses query.

BEGIN;

-- BOLT OPTIMIZATION: Covering index for pattern analysis
-- Expected impact: Significant reduction in query time for large response sets.
CREATE INDEX IF NOT EXISTS idx_responses_pattern_detection
ON responses(profile_id, response_type, answer_option_id);

COMMIT;
