-- supabase/migrations/20260119000000_add_rls_policies.sql
-- Row Level Security implementation for multi-tenant isolation
-- CRITICAL: This migration enforces data isolation between users

BEGIN;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

-- Public tables (read-only for authenticated users)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILE POLICIES
-- ============================================

-- Users can only view their own profile
CREATE POLICY "profile_select_own"
  ON profile FOR SELECT
  USING (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "profile_update_own"
  ON profile FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- System can insert profiles (handled by trigger on user creation)
CREATE POLICY "profile_insert_system"
  ON profile FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- ============================================
-- RESPONSES POLICIES
-- ============================================

-- Users can view their own responses
CREATE POLICY "responses_select_own"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = responses.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- Users can insert their own responses
CREATE POLICY "responses_insert_own"
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = responses.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- Users cannot update or delete responses (immutable audit log)
-- No UPDATE or DELETE policies = forbidden

-- ============================================
-- PATTERNS POLICIES
-- ============================================

-- Users can view their own patterns
CREATE POLICY "patterns_select_own"
  ON patterns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = patterns.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- System can insert/update patterns (via backend job)
CREATE POLICY "patterns_insert_system"
  ON patterns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = patterns.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

CREATE POLICY "patterns_update_system"
  ON patterns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = patterns.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- ============================================
-- ENTITY POLICIES
-- ============================================

-- Users can view their own entities
CREATE POLICY "entities_select_own"
  ON entities FOR SELECT
  USING (
    metadata->>'created_by' = auth.uid()::text
    OR metadata->>'visibility' = 'public'
  );

-- Users can insert/update their own entities
CREATE POLICY "entities_insert_own"
  ON entities FOR INSERT
  WITH CHECK (metadata->>'created_by' = auth.uid()::text);

CREATE POLICY "entities_update_own"
  ON entities FOR UPDATE
  USING (metadata->>'created_by' = auth.uid()::text);

CREATE POLICY "entities_delete_own"
  ON entities FOR DELETE
  USING (metadata->>'created_by' = auth.uid()::text);

-- ============================================
-- ENTITY ATTRIBUTES POLICIES
-- ============================================

CREATE POLICY "entity_attributes_select_own"
  ON entity_attributes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = entity_attributes.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

CREATE POLICY "entity_attributes_all_own"
  ON entity_attributes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = entity_attributes.profile_id
      AND auth.uid()::text = profile.id::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = entity_attributes.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- ============================================
-- WORKFLOWS POLICIES
-- ============================================

CREATE POLICY "workflows_all_own"
  ON workflows FOR ALL
  USING (metadata->>'profile_id' = auth.uid()::text);

CREATE POLICY "workflow_steps_all_own"
  ON workflow_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_steps.workflow_id
      AND workflows.metadata->>'profile_id' = auth.uid()::text
    )
  );

-- ============================================
-- RECOMMENDATIONS POLICIES
-- ============================================

CREATE POLICY "recommendations_select_own"
  ON recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = recommendations.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

CREATE POLICY "recommendations_update_own"
  ON recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = recommendations.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- ============================================
-- DATASETS POLICIES
-- ============================================

CREATE POLICY "datasets_all_own"
  ON datasets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = datasets.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

CREATE POLICY "dataset_records_all_own"
  ON dataset_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM datasets
      JOIN profile ON profile.id = datasets.profile_id
      WHERE datasets.id = dataset_records.dataset_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- ============================================
-- LEARNING SNAPSHOTS POLICIES
-- ============================================

CREATE POLICY "snapshots_select_own"
  ON learning_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = learning_snapshots.profile_id
      AND auth.uid()::text = profile.id::text
    )
  );

-- ============================================
-- PUBLIC READ-ONLY TABLES
-- ============================================

-- Questions (public read, admin write)
CREATE POLICY "questions_select_all"
  ON questions FOR SELECT
  USING (active = true);

-- Answer options (public read)
CREATE POLICY "answer_options_select_all"
  ON answer_options FOR SELECT
  USING (true);

-- Dimensions (public read)
CREATE POLICY "dimensions_select_all"
  ON dimensions FOR SELECT
  USING (true);

-- Aspects (public read)
CREATE POLICY "aspects_select_all"
  ON aspects FOR SELECT
  USING (true);

-- Contexts (public read)
CREATE POLICY "contexts_select_all"
  ON contexts FOR SELECT
  USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user owns a profile
CREATE OR REPLACE FUNCTION user_owns_profile(profile_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profile
    WHERE id = profile_id_param
    AND auth.uid()::text = id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profile table
CREATE TRIGGER update_profile_updated_at
  BEFORE UPDATE ON profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CASCADE DELETE POLICIES
-- ============================================

-- When profile is deleted, cascade to all related data
ALTER TABLE responses
  DROP CONSTRAINT IF EXISTS responses_profile_id_fkey,
  ADD CONSTRAINT responses_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profile(id)
    ON DELETE CASCADE;

ALTER TABLE patterns
  DROP CONSTRAINT IF EXISTS patterns_profile_id_fkey,
  ADD CONSTRAINT patterns_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profile(id)
    ON DELETE CASCADE;

ALTER TABLE entity_attributes
  DROP CONSTRAINT IF EXISTS entity_attributes_profile_id_fkey,
  ADD CONSTRAINT entity_attributes_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profile(id)
    ON DELETE CASCADE;

ALTER TABLE recommendations
  DROP CONSTRAINT IF EXISTS recommendations_profile_id_fkey,
  ADD CONSTRAINT recommendations_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profile(id)
    ON DELETE CASCADE;

ALTER TABLE datasets
  DROP CONSTRAINT IF EXISTS datasets_profile_id_fkey,
  ADD CONSTRAINT datasets_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES profile(id)
    ON DELETE CASCADE;

COMMIT;
