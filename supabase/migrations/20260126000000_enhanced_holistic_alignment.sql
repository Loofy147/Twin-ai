-- supabase/migrations/20260126000000_enhanced_holistic_alignment.sql
-- Harmonizing all identities: Bolt, Midas, Oracle, Palette, Sentinel, Sun Tzu, Tuber

BEGIN;

CREATE OR REPLACE FUNCTION get_holistic_alignment(p_profile_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_total_impact REAL;
  v_avg_conf REAL;
  v_dim_count INTEGER;
  v_synergy_count INTEGER;
  v_potential_synergies INTEGER;
  v_synergy_density REAL;
  v_stability_score REAL;
  v_privacy_shield REAL;
  v_strategic_coherence REAL;
  v_experience_clarity REAL;
  v_alignment_score REAL;
  v_interpretation TEXT;
  v_engagement_rate REAL;
BEGIN
  -- 1. MIDAS: Impact and Confidence
  SELECT
    COALESCE(SUM(impact_score), 0),
    COALESCE(AVG(confidence), 0),
    COUNT(DISTINCT dimension_id)
  INTO v_total_impact, v_avg_conf, v_dim_count
  FROM patterns
  WHERE profile_id = p_profile_id AND confidence > 0.3;

  -- 2. ORACLE: Synergy Density
  SELECT COUNT(*) INTO v_synergy_count
  FROM patterns
  WHERE profile_id = p_profile_id AND pattern_type LIKE 'synergy_%';

  IF v_dim_count > 1 THEN
    v_potential_synergies := (v_dim_count * (v_dim_count - 1)) / 2;
    v_synergy_density := v_synergy_count::REAL / v_potential_synergies;
  ELSE
    v_synergy_density := 0;
  END IF;

  -- 3. BOLT: Stability Score
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) / 2592000), 0.5)
  INTO v_stability_score
  FROM patterns
  WHERE profile_id = p_profile_id;
  v_stability_score := LEAST(1.0, v_stability_score);

  -- 4. SENTINEL: Privacy Shield Score
  -- Higher score for controlled dimension breadth and multi-tenant isolation
  v_privacy_shield := LEAST(1.0, (v_dim_count * 0.1) + 0.5);

  -- 5. SUN TZU: Strategic Coherence
  -- Balance between breadth (dim_count) and depth (avg_conf)
  v_strategic_coherence := GREATEST(0, 1.0 - ABS((v_dim_count::REAL / 15.0) - v_avg_conf));

  -- 6. PALETTE: Experience Clarity
  -- Use engagement_rate from v_current_profile
  SELECT engagement_rate INTO v_engagement_rate
  FROM v_current_profile
  WHERE id = p_profile_id::INTEGER; -- Assuming profile.id is INTEGER in SQLite but passed as TEXT here

  v_experience_clarity := COALESCE(v_engagement_rate, 0.7);

  -- 7. Unified Alignment Calculation - Harmonized Identities
  -- BOLT (0.1) + ORACLE (0.2) + MIDAS (0.2) + SENTINEL (0.2) + SUN TZU (0.15) + PALETTE (0.15)
  v_alignment_score := (
    (v_stability_score * 0.1) +
    (v_synergy_density * 0.2) +
    (v_avg_conf * 0.2) +
    (v_privacy_shield * 0.2) +
    (v_strategic_coherence * 0.15) +
    (v_experience_clarity * 0.15)
  );

  IF v_alignment_score > 0.8 THEN v_interpretation := 'Harmonious';
  ELSIF v_alignment_score > 0.5 THEN v_interpretation := 'Evolving';
  ELSIF v_alignment_score > 0.2 THEN v_interpretation := 'Initializing';
  ELSE v_interpretation := 'Fragmented';
  END IF;

  RETURN jsonb_build_object(
    'score', ROUND(v_alignment_score::numeric, 3),
    'interpretation', v_interpretation,
    'breakdown', jsonb_build_object(
      'stabilityScore', ROUND(v_stability_score::numeric, 2),
      'synergyDensity', ROUND(v_synergy_density::numeric, 2),
      'confidenceAverage', ROUND(v_avg_conf::numeric, 2),
      'privacyShieldScore', ROUND(v_privacy_shield::numeric, 2),
      'coherenceStrategic', ROUND(v_strategic_coherence::numeric, 2),
      'experienceClarity', ROUND(v_experience_clarity::numeric, 2)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
