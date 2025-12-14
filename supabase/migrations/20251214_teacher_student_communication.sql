-- Create teacher messages table
CREATE TABLE public.teacher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'speech')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create student responses table
CREATE TABLE public.student_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  sign TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_messages
CREATE POLICY "Session participants can view teacher messages" 
ON public.teacher_messages 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Session host can view
    EXISTS (
      SELECT 1 FROM public.live_sessions 
      WHERE id = teacher_messages.session_id 
      AND host_id = auth.uid()
    )
    OR
    -- Session participants can view (assuming participants table exists)
    EXISTS (
      SELECT 1 FROM public.live_sessions 
      WHERE id = teacher_messages.session_id 
      AND status = 'live'
    )
  )
);

CREATE POLICY "Session hosts can create teacher messages" 
ON public.teacher_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.live_sessions 
    WHERE id = teacher_messages.session_id 
    AND host_id = auth.uid()
  )
);

-- RLS Policies for student_responses
CREATE POLICY "Session participants can view student responses" 
ON public.student_responses 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Session host can view all responses
    EXISTS (
      SELECT 1 FROM public.live_sessions 
      WHERE id = student_responses.session_id 
      AND host_id = auth.uid()
    )
    OR
    -- Students can view their own responses
    student_id = auth.uid()
  )
);

CREATE POLICY "Students can create their own responses" 
ON public.student_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  student_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.live_sessions 
    WHERE id = student_responses.session_id 
    AND status = 'live'
  )
);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_responses;

-- Create indexes for better performance
CREATE INDEX idx_teacher_messages_session_id ON public.teacher_messages(session_id);
CREATE INDEX idx_teacher_messages_created_at ON public.teacher_messages(created_at DESC);
CREATE INDEX idx_student_responses_session_id ON public.student_responses(session_id);
CREATE INDEX idx_student_responses_student_id ON public.student_responses(student_id);
CREATE INDEX idx_student_responses_created_at ON public.student_responses(created_at DESC);