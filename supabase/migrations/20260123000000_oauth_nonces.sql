-- SENTINEL: Add oauth_nonces table to prevent OAuth CSRF and Session Fixation attacks - HIGH
CREATE TABLE IF NOT EXISTS oauth_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SENTINEL: Index for cleanup and lookup performance
CREATE INDEX IF NOT EXISTS idx_oauth_nonces_created_at ON oauth_nonces(created_at);
CREATE INDEX IF NOT EXISTS idx_oauth_nonces_profile_id ON oauth_nonces(profile_id);

-- SENTINEL: Enable RLS
ALTER TABLE oauth_nonces ENABLE ROW LEVEL SECURITY;

-- SENTINEL: Allow users to create their own nonces
CREATE POLICY "Users can create own nonces" ON oauth_nonces
  FOR INSERT WITH CHECK (auth.uid()::text = profile_id);

-- SENTINEL: System (Service Role) can do everything
-- Note: Service role bypasses RLS by default in Supabase/Postgres,
-- but we define policies for clarity or in case of restrictive defaults.
CREATE POLICY "Service role can select/delete nonces" ON oauth_nonces
  FOR ALL USING (true);

-- SENTINEL: Security cleanup function (can be called by cron or manually)
-- Removes nonces older than 15 minutes
CREATE OR REPLACE FUNCTION expire_oauth_nonces() RETURNS void AS $$
BEGIN
  DELETE FROM oauth_nonces WHERE created_at < now() - interval '15 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
