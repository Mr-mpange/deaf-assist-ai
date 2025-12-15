-- WebRTC Setup Script (Safe to run multiple times)
-- Run this in your Supabase SQL Editor

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_video_off BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies and create new ones
DO $$ 
BEGIN
  -- Drop existing policies (ignore errors if they don't exist)
  BEGIN
    DROP POLICY IF EXISTS "session_participants_select_policy" ON public.session_participants;
    DROP POLICY IF EXISTS "session_participants_insert_policy" ON public.session_participants;
    DROP POLICY IF EXISTS "session_participants_update_policy" ON public.session_participants;
    DROP POLICY IF EXISTS "session_participants_delete_policy" ON public.session_participants;
    
    -- Also drop any old policy names that might exist
    DROP POLICY IF EXISTS "Anyone can view session participants" ON public.session_participants;
    DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.session_participants;
    DROP POLICY IF EXISTS "Users can update their own participant record" ON public.session_participants;
    DROP POLICY IF EXISTS "Users can delete their own participant record" ON public.session_participants;
    DROP POLICY IF EXISTS "Session hosts can manage all participants" ON public.session_participants;
  EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore any errors from dropping non-existent policies
  END;
  
  -- Create new policies
  BEGIN
    EXECUTE 'CREATE POLICY "session_participants_select_policy" ON public.session_participants FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "session_participants_insert_policy" ON public.session_participants FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "session_participants_update_policy" ON public.session_participants FOR UPDATE USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "session_participants_delete_policy" ON public.session_participants FOR DELETE USING (auth.uid() = user_id)';
  EXCEPTION
    WHEN OTHERS THEN 
      RAISE NOTICE 'Error creating policies: %', SQLERRM;
  END;
END $$;

-- Add to realtime publication (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'Table already in realtime publication';
  WHEN OTHERS THEN 
    RAISE NOTICE 'Could not add to realtime: %', SQLERRM;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);

-- Success message
SELECT 'WebRTC setup completed! You can now use live video sessions.' as result;