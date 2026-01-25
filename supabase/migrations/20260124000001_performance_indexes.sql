-- supabase/migrations/20260124000001_performance_indexes.sql
-- Additional performance indexes for deployment

BEGIN;

-- 1. Optimized composite index for fetching user response history
-- Common in analytics and pattern detection
CREATE INDEX IF NOT EXISTS idx_responses_profile_created
ON responses(profile_id, created_at DESC);

-- 2. Optimized index for finding integration tokens by profile and type
-- Used in almost every page load to check connection status
CREATE INDEX IF NOT EXISTS idx_integration_tokens_profile_type
ON integration_tokens(profile_id, integration_type);

-- 3. Optimized index for finding patterns by profile and confidence
-- Used for fetching insights
CREATE INDEX IF NOT EXISTS idx_patterns_profile_confidence
ON patterns(profile_id, confidence DESC);

COMMIT;
