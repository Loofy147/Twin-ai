-- supabase/migrations/20260119000003_fix_entities_schema.sql
-- Fix entities schema for multi-tenant isolation and update RLS policies

BEGIN;

-- 1. Update entities table
ALTER TABLE entities ADD COLUMN IF NOT EXISTS profile_id TEXT REFERENCES profile(id);

-- Migration: populate profile_id from metadata if possible (best effort)
UPDATE entities SET profile_id = metadata->>'created_by' WHERE profile_id IS NULL;

-- 2. Update unique constraints on entities
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_name_entity_type_key;
ALTER TABLE entities ADD CONSTRAINT entities_profile_name_type_unique UNIQUE (profile_id, name, entity_type);

-- 3. Update RLS policies for entities
DROP POLICY IF EXISTS "entities_select_own" ON entities;
DROP POLICY IF EXISTS "entities_insert_own" ON entities;
DROP POLICY IF EXISTS "entities_update_own" ON entities;
DROP POLICY IF EXISTS "entities_delete_own" ON entities;

CREATE POLICY "entities_select_own"
  ON entities FOR SELECT
  USING (
    profile_id = auth.uid()::text
    OR metadata->>'visibility' = 'public'
  );

CREATE POLICY "entities_insert_own"
  ON entities FOR INSERT
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "entities_update_own"
  ON entities FOR UPDATE
  USING (profile_id = auth.uid()::text)
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "entities_delete_own"
  ON entities FOR DELETE
  USING (profile_id = auth.uid()::text);

-- 4. Ensure unique constraint on integration_tokens for upsert
ALTER TABLE integration_tokens DROP CONSTRAINT IF EXISTS integration_tokens_profile_id_integration_type_key;
ALTER TABLE integration_tokens ADD CONSTRAINT integration_tokens_profile_type_unique UNIQUE (profile_id, integration_type);

COMMIT;
