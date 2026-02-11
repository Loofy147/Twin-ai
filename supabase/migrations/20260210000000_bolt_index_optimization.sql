-- supabase/migrations/20260210000000_bolt_index_optimization.sql
-- Performance optimization for response analysis and question selection

BEGIN;

/**
 * BOLT OPTIMIZATION: Composite index for pattern detection
 * This index speeds up the join between responses and answer_options
 * which is performed every time patterns are recalculated.
 * It also filters efficiently by response_type.
 */
CREATE INDEX IF NOT EXISTS idx_responses_pattern_detection
ON responses(profile_id, response_type, answer_option_id);

/**
 * BOLT OPTIMIZATION: Composite indexes for the question selection engine
 * These indexes ensure that fetching unanswered questions and checking coverage
 * remains O(log N) as the question bank and response history grow.
 */
CREATE INDEX IF NOT EXISTS idx_questions_active_engagement ON questions(active, engagement_factor DESC);
CREATE INDEX IF NOT EXISTS idx_responses_question_profile ON responses(question_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_questions_profile_active_engagement ON questions(profile_id, active, engagement_factor DESC);

COMMIT;
