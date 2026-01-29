-- supabase/migrations/20260126000001_questions_performance_index.sql
-- BOLT OPTIMIZATION: High-performance composite indexes for question selection

BEGIN;

-- 1. Optimized index for default question ordering and active filtering
-- This allows Postgres to perform an index scan for the most common question query,
-- completely avoiding a sort operation.
CREATE INDEX IF NOT EXISTS idx_questions_active_engagement
ON questions(active, engagement_factor DESC);

-- 2. Optimized composite index for unanswered question checks
-- This allows the NOT EXISTS check in the get_unanswered_questions RPC
-- to perform a fast index-only scan, significantly reducing I/O.
CREATE INDEX IF NOT EXISTS idx_responses_question_profile
ON responses(question_id, profile_id);

-- 3. Optimized index for profile-specific questions (multi-tenant)
-- Added to support the new profile_id column in the questions table
CREATE INDEX IF NOT EXISTS idx_questions_profile_active_engagement
ON questions(profile_id, active, engagement_factor DESC)
WHERE profile_id IS NOT NULL;

COMMIT;
