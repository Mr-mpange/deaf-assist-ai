-- Drop ALL existing storage policies on session-recordings bucket to start fresh
DROP POLICY IF EXISTS "Session hosts can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Session hosts can update recordings" ON storage.objects;
DROP POLICY IF EXISTS "Session hosts can delete recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view session recordings" ON storage.objects;

-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'session-recordings';

-- Recreate secure policies
CREATE POLICY "Auth users can view session recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Hosts can upload session recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM live_sessions ls 
    WHERE ls.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update session recordings"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM live_sessions ls 
    WHERE ls.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete session recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM live_sessions ls 
    WHERE ls.host_id = auth.uid()
  )
);