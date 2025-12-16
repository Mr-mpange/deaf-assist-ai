-- Fix for lesson video playback issues
-- Run this in Supabase SQL Editor if lesson videos won't play

-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for lesson videos bucket
DROP POLICY IF EXISTS "Anyone can view lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete lesson videos" ON storage.objects;

CREATE POLICY "Anyone can view lesson videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-videos');

CREATE POLICY "Teachers can upload lesson videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-videos' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Teachers can update lesson videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'lesson-videos' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Teachers can delete lesson videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lesson-videos' 
    AND auth.uid() IS NOT NULL
  );

-- Ensure lessons table exists with proper structure
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on lessons table
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons" ON lessons;

-- Create RLS policies for lessons
CREATE POLICY "Anyone can view lessons" ON lessons
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage lessons" ON lessons
  FOR ALL USING (
    auth.uid() = author_id 
    OR auth.uid() IS NOT NULL
  );

-- Grant permissions
GRANT ALL ON lessons TO authenticated;

SELECT 'Lesson video storage setup complete!' as status;