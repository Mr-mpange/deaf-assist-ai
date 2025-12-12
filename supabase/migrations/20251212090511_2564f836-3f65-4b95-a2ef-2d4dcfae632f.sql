-- Create storage bucket for session recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('session-recordings', 'session-recordings', true, 104857600);

-- Allow authenticated users to view recordings
CREATE POLICY "Anyone can view session recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'session-recordings');

-- Allow session hosts to upload recordings
CREATE POLICY "Session hosts can upload recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
);

-- Allow session hosts to delete their recordings
CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
);