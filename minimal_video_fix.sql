-- Minimal fix for video playback - most compatible
-- Run this in Supabase SQL Editor

-- Create storage buckets (public access for easier testing)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('lesson-videos', 'lesson-videos', true),
  ('session-recordings', 'session-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  author_id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID,
  title TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'recording',
  recording_url TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS temporarily for testing (you can re-enable later)
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings DISABLE ROW LEVEL SECURITY;

-- Grant full access for testing
GRANT ALL ON lessons TO anon, authenticated;
GRANT ALL ON session_recordings TO anon, authenticated;

-- Grant storage access
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

SELECT 'Minimal video setup complete! Videos should work now.' as status;