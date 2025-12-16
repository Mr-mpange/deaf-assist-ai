-- Simple fix for video playback issues
-- Run this in Supabase SQL Editor

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('lesson-videos', 'lesson-videos', true),
  ('session-recordings', 'session-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Simple approach: Drop all existing policies and recreate
DO $$
BEGIN
  -- Drop existing storage policies (ignore errors if they don't exist)
  BEGIN
    DROP POLICY "Anyone can view lesson videos" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    DROP POLICY "Teachers can upload lesson videos" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    DROP POLICY "Users can view session recordings" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    DROP POLICY "Authenticated users can upload recordings" ON storage.objects;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create new storage policies
CREATE POLICY "Anyone can view lesson videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-videos');

CREATE POLICY "Teachers can upload lesson videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lesson-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view session recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'session-recordings');

CREATE POLICY "Authenticated users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'session-recordings' AND auth.uid() IS NOT NULL);

-- Ensure tables exist
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  author_id UUID NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- Simple table policies
DROP POLICY IF EXISTS "Public read access" ON lessons;
CREATE POLICY "Public read access" ON lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated write access" ON lessons;
CREATE POLICY "Authenticated write access" ON lessons FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read recordings" ON session_recordings;
CREATE POLICY "Public read recordings" ON session_recordings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated write recordings" ON session_recordings;
CREATE POLICY "Authenticated write recordings" ON session_recordings FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON lessons TO authenticated;
GRANT ALL ON session_recordings TO authenticated;

SELECT 'Video storage setup complete! Try playing videos now.' as status;