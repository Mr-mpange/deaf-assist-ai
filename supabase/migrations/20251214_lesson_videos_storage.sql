-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lesson-videos', 'lesson-videos', true, 524288000); -- 500MB limit

-- Allow anyone to view lesson videos (public access)
CREATE POLICY "Anyone can view lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');

-- Allow teachers to upload lesson videos
CREATE POLICY "Teachers can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-videos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('teacher', 'admin')
  )
);

-- Allow teachers to update their own lesson videos
CREATE POLICY "Teachers can update own lesson videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lesson-videos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('teacher', 'admin')
  )
);

-- Allow teachers to delete their own lesson videos
CREATE POLICY "Teachers can delete own lesson videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-videos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('teacher', 'admin')
  )
);