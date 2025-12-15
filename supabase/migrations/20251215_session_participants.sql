-- Create session_participants table for real-time participant tracking
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

-- Enable RLS
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Session participants can view all participants in their session" 
ON public.session_participants 
FOR SELECT 
USING (
  -- User is a participant in this session
  EXISTS (
    SELECT 1 FROM public.session_participants sp 
    WHERE sp.session_id = session_participants.session_id 
    AND sp.user_id = auth.uid()
  )
  OR
  -- Or session is live and public
  EXISTS (
    SELECT 1 FROM public.live_sessions ls 
    WHERE ls.id = session_participants.session_id 
    AND ls.status = 'live'
  )
);

CREATE POLICY "Users can insert themselves as participants" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  AND
  -- Session must exist and be live or scheduled
  EXISTS (
    SELECT 1 FROM public.live_sessions 
    WHERE id = session_id 
    AND status IN ('live', 'scheduled')
  )
);

CREATE POLICY "Users can update their own participant record" 
ON public.session_participants 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participant record" 
ON public.session_participants 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Session hosts can delete any participant" 
ON public.session_participants 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions 
    WHERE id = session_participants.session_id 
    AND host_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_joined_at ON public.session_participants(joined_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_session_participants_updated_at ON public.session_participants;
CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_session_participants_updated_at();

-- Function to clean up participants when session ends
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

-- Trigger to cleanup participants when session ends
DROP TRIGGER IF EXISTS cleanup_session_participants_trigger ON public.live_sessions;
CREATE TRIGGER cleanup_session_participants_trigger
  AFTER UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_session_participants();