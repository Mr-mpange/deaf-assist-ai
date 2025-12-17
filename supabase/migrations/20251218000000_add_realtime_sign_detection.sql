-- Add real-time sign detection columns to raised_hands table
ALTER TABLE public.raised_hands 
ADD COLUMN IF NOT EXISTS current_sign TEXT,
ADD COLUMN IF NOT EXISTS current_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS last_detected_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_raised_hands_session_status 
ON public.raised_hands(session_id, status);

-- Add policy for students to update their own detection
CREATE POLICY "Students can update their own detection" 
ON public.raised_hands 
FOR UPDATE 
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
