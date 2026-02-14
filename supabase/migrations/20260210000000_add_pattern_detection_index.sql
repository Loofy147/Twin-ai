-- supabase/migrations/20260210000000_add_pattern_detection_index.sql
-- BOLT OPTIMIZATION: High-impact covering index for response analysis
-- Identical to local SQLite schema to ensure environmental parity.

BEGIN;

-- This index optimizes the join in PatternDetector.analyzeResponses
-- by providing a covering index for the primary filter and join columns.
CREATE INDEX IF NOT EXISTS idx_responses_pattern_detection
ON responses(profile_id, response_type, answer_option_id);

COMMIT;
