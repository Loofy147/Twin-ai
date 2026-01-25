-- supabase/migrations/20260124000000_audit_triggers.sql
-- Automatic audit logging for sensitive events

BEGIN;

-- 1. Trigger for integration_tokens
CREATE OR REPLACE FUNCTION audit_integration_tokens()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_event(
      NEW.profile_id,
      'integration_connect',
      'integration',
      NEW.integration_type,
      jsonb_build_object('id', NEW.id, 'scopes', NEW.scopes)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log token refreshes if tokens changed
    IF (OLD.access_token <> NEW.access_token OR OLD.refresh_token <> NEW.refresh_token) THEN
      PERFORM log_audit_event(
        NEW.profile_id,
        'integration_token_refresh',
        'integration',
        NEW.integration_type,
        jsonb_build_object('id', NEW.id)
      );
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_event(
      OLD.profile_id,
      'integration_disconnect',
      'integration',
      OLD.integration_type,
      jsonb_build_object('id', OLD.id)
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS trigger_audit_integration_tokens ON integration_tokens;

CREATE TRIGGER trigger_audit_integration_tokens
AFTER INSERT OR UPDATE OR DELETE ON integration_tokens
FOR EACH ROW EXECUTE FUNCTION audit_integration_tokens();

-- 2. Trigger for profile updates
CREATE OR REPLACE FUNCTION audit_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if significant fields changed, to avoid noise from total_responses
  IF (OLD.engagement_score <> NEW.engagement_score OR OLD.learning_version <> NEW.learning_version OR OLD.metadata <> NEW.metadata) THEN
    PERFORM log_audit_event(
      NEW.id,
      'profile_update',
      'profile',
      NEW.id,
      jsonb_build_object(
        'old_engagement', OLD.engagement_score,
        'new_engagement', NEW.engagement_score,
        'old_version', OLD.learning_version,
        'new_version', NEW.learning_version
      )
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_audit_profile_updates ON profile;

CREATE TRIGGER trigger_audit_profile_updates
AFTER UPDATE ON profile
FOR EACH ROW EXECUTE FUNCTION audit_profile_updates();

-- 3. Additional indexes for audit_log (Tuber/Bolt)
CREATE INDEX IF NOT EXISTS idx_audit_log_profile_created
ON audit_log(profile_id, created_at DESC);

COMMIT;
