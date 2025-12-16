-- Fix for session recording storage issues
-- Run this in Supabase SQL Editor if recordings won't play

-- Create storage bucket for session recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-recordings', 'session-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
DROP POLICY IF EXISTS "Users can view session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;

CREATE POLICY "Users can view session recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'session-recordings');

CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'session-recordings' 
    AND auth.uid() IS NOT NULL
  );

-- Create session_recordings table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'recording',
  recording_url TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view recordings" ON session_recordings;
DROP POLICY IF EXISTS "Users can manage recordings" ON session_recordings;

-- Simple RLS policy
CREATE POLICY "Users can view recordings" ON session_recordings
  FOR SELECT USING (true); -- Allow all authenticated users to view recordings

CREATE POLICY "Users can manage recordings" ON session_recordings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON session_recordings TO authenticated;

SELECT 'Recording storage setup complete!' as status;