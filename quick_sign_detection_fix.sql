-- Quick fix for sign detection in live sessions
-- Run this in Supabase SQL Editor if sign detection isn't working

-- Create the sign_messages table
CREATE TABLE IF NOT EXISTS sign_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  sign_text TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sign_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their sign messages" ON sign_messages;

-- Simple RLS policy - users can read and write their own messages
CREATE POLICY "Users can manage their sign messages" ON sign_messages
  FOR ALL USING (participant_id = auth.uid());

-- Grant permissions
GRANT ALL ON sign_messages TO authenticated;

-- Test insert (replace with your actual user ID and session ID)
-- INSERT INTO sign_messages (session_id, participant_id, participant_name, sign_text, confidence)
-- VALUES ('your-session-id', auth.uid(), 'Test User', 'HELLO', 0.95);

SELECT 'Sign detection setup complete!' as status;