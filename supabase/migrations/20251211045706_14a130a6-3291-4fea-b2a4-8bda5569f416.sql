-- Create raised_hands table for live session Q&A
CREATE TABLE public.raised_hands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'raised', -- raised, called, answered, dismissed
  raised_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  answer_sign TEXT,
  answer_confidence NUMERIC
);

-- Enable RLS
ALTER TABLE public.raised_hands ENABLE ROW LEVEL SECURITY;

-- Students can raise their own hand
CREATE POLICY "Students can raise hand" 
ON public.raised_hands 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Students can view hands in sessions they're in
CREATE POLICY "Authenticated users can view raised hands" 
ON public.raised_hands 
FOR SELECT 
TO authenticated
USING (true);

-- Teachers can update raised hands (call on students, dismiss)
CREATE POLICY "Session hosts can update raised hands" 
ON public.raised_hands 
FOR UPDATE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM live_sessions ls 
  WHERE ls.id = raised_hands.session_id 
  AND ls.host_id = auth.uid()
));

-- Students can update their own raised hand (to submit answer)
CREATE POLICY "Students can update own raised hand" 
ON public.raised_hands 
FOR UPDATE 
TO authenticated
USING (auth.uid() = student_id);

-- Students can delete their own raised hand
CREATE POLICY "Students can lower own hand" 
ON public.raised_hands 
FOR DELETE 
TO authenticated
USING (auth.uid() = student_id);

-- Enable realtime for raised_hands
ALTER PUBLICATION supabase_realtime ADD TABLE public.raised_hands;