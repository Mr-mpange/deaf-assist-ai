-- Setup script for WebRTC Live Sessions
-- Run this in your Supabase SQL Editor

-- 1. Create session_participants table
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_video_off BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one record per user per session
  UNIQUE(session_id, user_id)
);

-- 2. Enable RLS on session_participants
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view session participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.session_participants;
DROP POLICY IF EXISTS "Users can delete their own participant record" ON public.session_participants;
DROP POLICY IF EXISTS "Session hosts can manage all participants" ON public.session_participants;

-- 4. Create simple, non-conflicting RLS policies
CREATE POLICY "session_participants_select_policy" 
ON public.session_participants 
FOR SELECT 
USING (true);

CREATE POLICY "session_participants_insert_policy" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "session_participants_update_policy" 
ON public.session_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "session_participants_delete_policy" 
ON public.session_participants 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.live_sessions ls 
    WHERE ls.id = session_participants.session_id 
    AND ls.host_id = auth.uid()
  )
);

-- 5. Enable realtime for session_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_joined_at ON public.session_participants(joined_at DESC);

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_session_participants_updated_at ON public.session_participants;
CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_session_participants_updated_at();

-- 9. Create function to clean up participants when session ends
CREATE OR REPLACE FUNCTION cleanup_session_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- When a session is ended, remove all participants
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    DELETE FROM public.session_participants 
    WHERE session_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to cleanup participants when session ends
DROP TRIGGER IF EXISTS cleanup_session_participants_trigger ON public.live_sessions;
CREATE TRIGGER cleanup_session_participants_trigger
  AFTER UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_session_participants();

-- Success message
SELECT 'WebRTC setup completed successfully!' as status;