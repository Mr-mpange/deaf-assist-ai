-- Add difficulty column
ALTER TABLE public.quiz_scores ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium';

-- Allow all authenticated users to view quiz scores (for leaderboard)
DROP POLICY IF EXISTS "Users can view own quiz scores" ON public.quiz_scores;
CREATE POLICY "Authenticated users can view quiz scores"
  ON public.quiz_scores FOR SELECT
  TO authenticated
  USING (true);
