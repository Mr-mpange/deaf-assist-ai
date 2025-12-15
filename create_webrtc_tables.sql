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
DROP POLICY IF EXISTS "Session participants can view all participants in their session" ON public.session_participants;
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

DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.session_participants;
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

DROP POLICY IF EXISTS "Users can update their own participant record" ON public.session_participants;
CREATE POLICY "Users can update their own participant record" 
ON public.session_participants 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own participant record" ON public.session_participants;
CREATE POLICY "Users can delete their own participant record" 
ON public.session_participants 
FOR DELETE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Session hosts can delete any participant" ON public.session_participants;
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

-- Create WebRTC signaling table for more reliable peer-to-peer connections
CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only see signals meant for them
DROP POLICY IF EXISTS "Users can view signals addressed to them" ON public.webrtc_signals;
CREATE POLICY "Users can view signals addressed to them" 
ON public.webrtc_signals 
FOR SELECT 
USING (
  auth.uid() = to_user_id
  OR 
  auth.uid() = from_user_id
);

DROP POLICY IF EXISTS "Users can create signals" ON public.webrtc_signals;
CREATE POLICY "Users can create signals" 
ON public.webrtc_signals 
FOR INSERT 
WITH CHECK (
  auth.uid() = from_user_id
  AND
  -- Both users must be participants in the session
  EXISTS (
    SELECT 1 FROM public.session_participants 
    WHERE session_id = webrtc_signals.session_id 
    AND user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM public.session_participants 
    WHERE session_id = webrtc_signals.session_id 
    AND user_id = webrtc_signals.to_user_id
  )
);

DROP POLICY IF EXISTS "Users can update signals they received" ON public.webrtc_signals;
CREATE POLICY "Users can update signals they received" 
ON public.webrtc_signals 
FOR UPDATE 
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_session_id ON public.webrtc_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user_id ON public.webrtc_signals(to_user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_processed ON public.webrtc_signals(processed);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_created_at ON public.webrtc_signals(created_at DESC);