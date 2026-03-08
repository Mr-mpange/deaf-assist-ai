CREATE TABLE public.quiz_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  quiz_type TEXT NOT NULL DEFAULT 'fingerspelling',
  timed BOOLEAN NOT NULL DEFAULT false,
  time_per_question INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz scores"
  ON public.quiz_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz scores"
  ON public.quiz_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
