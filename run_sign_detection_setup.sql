-- Run this in your Supabase SQL Editor to set up live sign detection
-- This creates the sign_messages table for real-time sign sharing

-- Create sign_messages table for live sign language detection sharing
CREATE TABLE IF NOT EXISTS sign_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  sign_text TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sign_messages_session_id ON sign_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sign_messages_created_at ON sign_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_sign_messages_participant_id ON sign_messages(participant_id);

-- Enable RLS
ALTER TABLE sign_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read sign messages from their sessions" ON sign_messages;
DROP POLICY IF EXISTS "Users can insert their own sign messages" ON sign_messages;
DROP POLICY IF EXISTS "Users can update their own sign messages" ON sign_messages;
DROP POLICY IF EXISTS "Users can delete their own sign messages" ON sign_messages;

-- RLS Policies
-- Users can read all sign messages from sessions they're participating in
CREATE POLICY "Users can read sign messages from their sessions" ON sign_messages
  FOR SELECT USING (
    session_id IN (
      SELECT sp.session_id 
      FROM session_participants sp 
      WHERE sp.user_id = auth.uid()
    )
    OR 
    session_id IN (
      SELECT ls.id 
      FROM live_sessions ls 
      WHERE ls.host_id = auth.uid()
    )
  );

-- Users can insert their own sign messages
CREATE POLICY "Users can insert their own sign messages" ON sign_messages
  FOR INSERT WITH CHECK (
    participant_id = auth.uid()
    AND 
    (
      session_id IN (
        SELECT sp.session_id 
        FROM session_participants sp 
        WHERE sp.user_id = auth.uid()
      )
      OR 
      session_id IN (
        SELECT ls.id 
        FROM live_sessions ls 
        WHERE ls.host_id = auth.uid()
      )
    )
  );

-- Users can update their own sign messages
CREATE POLICY "Users can update their own sign messages" ON sign_messages
  FOR UPDATE USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());

-- Users can delete their own sign messages
CREATE POLICY "Users can delete their own sign messages" ON sign_messages
  FOR DELETE USING (participant_id = auth.uid());

-- Grant permissions
GRANT ALL ON sign_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test the setup
SELECT 'Sign detection table setup completed successfully!' as status;