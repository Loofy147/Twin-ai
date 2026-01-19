-- Function to calculate current streak
CREATE OR REPLACE FUNCTION get_user_streak(profile_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    current_date_val DATE := CURRENT_DATE;
    temp_count INTEGER;
BEGIN
    LOOP
        -- Check if user has any responses on this day
        SELECT COUNT(*) INTO temp_count
        FROM responses
        WHERE profile_id = profile_id_param
        AND created_at::DATE = current_date_val;

        IF temp_count > 0 THEN
            streak_count := streak_count + 1;
            current_date_val := current_date_val - INTERVAL '1 day';
        ELSE
            -- If it's today and they haven't answered yet, don't break the streak, check yesterday
            IF current_date_val = CURRENT_DATE THEN
                current_date_val := current_date_val - INTERVAL '1 day';
                -- Check if they answered yesterday
                SELECT COUNT(*) INTO temp_count
                FROM responses
                WHERE profile_id = profile_id_param
                AND created_at::DATE = current_date_val;

                IF temp_count = 0 THEN
                    -- No answers today and no answers yesterday, streak is 0
                    EXIT;
                END IF;
                CONTINUE;
            ELSE
                -- Not today, and no answers on this day, so streak is broken
                EXIT;
            END IF;
        END IF;
    END LOOP;
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all key metrics for a user
CREATE OR REPLACE FUNCTION get_user_metrics(profile_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
    total_q INTEGER;
    avg_conf REAL;
    streak INTEGER;
    xp INTEGER;
    comp_rate REAL;
BEGIN
    -- Basic metrics
    SELECT COUNT(*) INTO total_q FROM responses WHERE profile_id = profile_id_param;
    SELECT COALESCE(AVG(confidence_level) * 100, 0) INTO avg_conf FROM responses WHERE profile_id = profile_id_param;

    -- Streak
    streak := get_user_streak(profile_id_param);

    -- XP (Placeholder logic: 5 XP per question)
    xp := total_q * 5;

    -- Completion Rate (Placeholder: 94% or based on total questions vs total bank)
    -- For now, let's just make it slightly dynamic
    comp_rate := CASE WHEN total_q > 500 THEN 98.0 ELSE 94.0 END;

    RETURN jsonb_build_object(
        'total_questions', total_q,
        'completion_rate', comp_rate,
        'avg_confidence', ROUND(avg_conf::numeric, 1),
        'streak', streak,
        'xp', xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
