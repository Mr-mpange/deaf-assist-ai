-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create lessons table
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'Basics',
    difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    duration INTEGER NOT NULL DEFAULT 10,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    requirement_type TEXT NOT NULL, -- 'lessons_completed', 'practice_sessions', 'streak_days', 'signs_learned'
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table (earned badges)
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, badge_id)
);

-- Create user_progress table
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lessons_completed INTEGER NOT NULL DEFAULT 0,
    practice_sessions INTEGER NOT NULL DEFAULT 0,
    signs_learned INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_watch_time INTEGER NOT NULL DEFAULT 0, -- in minutes
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Create lesson_progress table (tracks individual lesson progress)
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, lesson_id)
);

-- Create practice_sessions table
CREATE TABLE public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signs_practiced TEXT[] NOT NULL DEFAULT '{}',
    accuracy_score DECIMAL(5,2),
    duration INTEGER NOT NULL DEFAULT 0, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live_sessions table
CREATE TABLE public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    participants_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table (student practice submissions for teacher review)
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved')),
    feedback TEXT,
    ai_prediction JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Get user's role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (read-only for users, only admins can modify)
CREATE POLICY "Roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own role on signup" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for lessons
CREATE POLICY "Lessons are viewable by everyone" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Teachers can create lessons" ON public.lessons FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Authors can update own lessons" ON public.lessons FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own lessons" ON public.lessons FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for badges
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);

-- RLS Policies for user_badges
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_progress
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view own practice sessions" ON public.practice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own practice sessions" ON public.practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for live_sessions
CREATE POLICY "Live sessions viewable by all authenticated" ON public.live_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create live sessions" ON public.live_sessions FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Hosts can update own sessions" ON public.live_sessions FOR UPDATE USING (auth.uid() = host_id);

-- RLS Policies for submissions
CREATE POLICY "Students can view own submissions" ON public.submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view submissions for their lessons" ON public.submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = submissions.lesson_id AND lessons.author_id = auth.uid())
);
CREATE POLICY "Students can create submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can update submissions" ON public.submissions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = submissions.lesson_id AND lessons.author_id = auth.uid())
);

-- Trigger to create profile and progress on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email));
    
    -- Create user progress
    INSERT INTO public.user_progress (user_id)
    VALUES (NEW.id);
    
    -- Create default student role (can be changed later)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'));
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    SELECT last_activity_date, current_streak, longest_streak 
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM public.user_progress WHERE user_id = p_user_id;
    
    IF v_last_activity IS NULL OR v_last_activity < CURRENT_DATE - 1 THEN
        -- Streak broken or first activity
        v_current_streak := 1;
    ELSIF v_last_activity = CURRENT_DATE - 1 THEN
        -- Continue streak
        v_current_streak := v_current_streak + 1;
    END IF;
    -- If v_last_activity = CURRENT_DATE, do nothing (already counted today)
    
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;
    
    UPDATE public.user_progress 
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Insert default badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value) VALUES
    ('First Steps', 'Complete your first lesson', '🎯', 'lessons_completed', 1),
    ('Dedicated Learner', 'Complete 5 lessons', '📚', 'lessons_completed', 5),
    ('Knowledge Seeker', 'Complete 10 lessons', '🎓', 'lessons_completed', 10),
    ('Practice Beginner', 'Complete 3 practice sessions', '💪', 'practice_sessions', 3),
    ('Practice Pro', 'Complete 10 practice sessions', '🏆', 'practice_sessions', 10),
    ('Week Warrior', 'Maintain a 7-day streak', '🔥', 'streak_days', 7),
    ('Month Master', 'Maintain a 30-day streak', '⭐', 'streak_days', 30),
    ('Sign Starter', 'Learn 10 signs', '👋', 'signs_learned', 10),
    ('Sign Expert', 'Learn 50 signs', '🤟', 'signs_learned', 50);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();