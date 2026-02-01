-- Create session_participants table for tracking who is in a live session
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_video_off BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create sign_messages table for storing detected sign language messages
CREATE TABLE public.sign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  sign_text TEXT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_responses table for tracking student answers
CREATE TABLE public.student_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'sign',
  response_content TEXT,
  detected_sign TEXT,
  confidence DECIMAL(5,2),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teacher_messages table for teacher broadcasts
CREATE TABLE public.teacher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  target_student_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_participants
CREATE POLICY "Authenticated users can view session participants"
  ON public.session_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join sessions"
  ON public.session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participant status"
  ON public.session_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave sessions"
  ON public.session_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for sign_messages
CREATE POLICY "Authenticated users can view sign messages"
  ON public.sign_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can insert sign messages"
  ON public.sign_messages FOR INSERT
  WITH CHECK (auth.uid() = participant_id);

-- RLS policies for student_responses
CREATE POLICY "Authenticated users can view student responses"
  ON public.student_responses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Students can insert own responses"
  ON public.student_responses FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Session hosts can update responses"
  ON public.student_responses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM live_sessions ls 
    WHERE ls.id = student_responses.session_id 
    AND ls.host_id = auth.uid()
  ));

-- RLS policies for teacher_messages
CREATE POLICY "Authenticated users can view teacher messages"
  ON public.teacher_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can insert messages"
  ON public.teacher_messages FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Enable realtime for live session tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sign_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;