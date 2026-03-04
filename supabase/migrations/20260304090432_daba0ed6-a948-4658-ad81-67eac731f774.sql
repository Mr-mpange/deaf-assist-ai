
-- Create table for multiplayer match results
CREATE TABLE public.match_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  signs_correct INTEGER NOT NULL DEFAULT 0,
  signs_total INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT NULL,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view the leaderboard
CREATE POLICY "Anyone can view match results"
ON public.match_results
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own match results
CREATE POLICY "Users can insert own match results"
ON public.match_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for leaderboard queries
CREATE INDEX idx_match_results_user_id ON public.match_results(user_id);
CREATE INDEX idx_match_results_created_at ON public.match_results(created_at DESC);
