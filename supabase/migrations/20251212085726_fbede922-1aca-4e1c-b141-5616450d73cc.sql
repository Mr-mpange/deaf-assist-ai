-- Create session recordings table
CREATE TABLE public.session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  recording_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'recording',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view recordings
CREATE POLICY "Authenticated users can view recordings" 
ON public.session_recordings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only session host can manage recordings
CREATE POLICY "Session hosts can manage recordings" 
ON public.session_recordings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions 
    WHERE id = session_recordings.session_id 
    AND host_id = auth.uid()
  )
);

-- Enable realtime for recordings
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_recordings;