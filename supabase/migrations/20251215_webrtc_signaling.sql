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
CREATE POLICY "Users can view signals addressed to them" 
ON public.webrtc_signals 
FOR SELECT 
USING (
  auth.uid() = to_user_id
  OR 
  auth.uid() = from_user_id
);

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

-- Function to clean up old signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_webrtc_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webrtc_signals 
  WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up signals when session ends
CREATE OR REPLACE FUNCTION cleanup_webrtc_signals_on_session_end()
RETURNS TRIGGER AS $$
BEGIN
  -- When a session is ended, remove all signals
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    DELETE FROM public.webrtc_signals 
    WHERE session_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup signals when session ends
DROP TRIGGER IF EXISTS cleanup_webrtc_signals_trigger ON public.live_sessions;
CREATE TRIGGER cleanup_webrtc_signals_trigger
  AFTER UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_webrtc_signals_on_session_end();