-- Clean up old session participant data that might have incorrect names
-- This will help ensure fresh participant data in live sessions

-- First, let's see what's in the session_participants table
SELECT * FROM session_participants LIMIT 5;

-- Clear all session participants (they'll be recreated when users join)
-- Using a simple DELETE without time filter to be safe
DELETE FROM session_participants;

-- Clear any old live sessions that might be stuck
UPDATE live_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live';

-- Check if sign_messages table exists and clear it
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sign_messages') THEN
        DELETE FROM sign_messages;
    END IF;
END $$;

-- Check if raised_hands table exists and clear it
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'raised_hands') THEN
        DELETE FROM raised_hands;
    END IF;
END $$;

-- Verify profile data is correct
SELECT 
  user_id,
  name
FROM profiles 
ORDER BY updated_at DESC;