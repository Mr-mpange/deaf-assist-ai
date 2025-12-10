import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number;
  difficulty: string;
  category: string;
  author_id: string;
  views: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  progress_percent: number;
  completed: boolean;
  completed_at: string | null;
}

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        author:profiles!lessons_author_id_fkey(name)
      `)
      .order('created_at', { ascending: false });
    
    if (data) {
      setLessons(data.map(lesson => ({
        ...lesson,
        author_name: (lesson.author as any)?.name || 'Unknown'
      })));
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const incrementViews = useCallback(async (lessonId: string) => {
    // Update views directly
    await supabase
      .from('lessons')
      .update({ views: supabase.rpc ? undefined : undefined })
      .eq('id', lessonId);
  }, []);

  return {
    lessons,
    isLoading,
    refetch: fetchLessons,
    incrementViews,
  };
}

export function useLessonProgress(lessonId?: string) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user || !lessonId) {
      setIsLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    
    if (data) {
      setProgress(data as LessonProgress);
    }
    
    setIsLoading(false);
  }, [user, lessonId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updateProgress = useCallback(async (progressPercent: number) => {
    if (!user || !lessonId) return;
    
    const completed = progressPercent >= 100;
    
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('lesson_progress')
        .update({
          progress_percent: progressPercent,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('lesson_progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          progress_percent: progressPercent,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });
    }
    
    await fetchProgress();
  }, [user, lessonId, fetchProgress]);

  return {
    progress,
    isLoading,
    updateProgress,
    refetch: fetchProgress,
  };
}
