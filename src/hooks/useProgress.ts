import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserProgress {
  id: string;
  user_id: string;
  lessons_completed: number;
  practice_sessions: number;
  signs_learned: number;
  current_streak: number;
  longest_streak: number;
  total_watch_time: number;
  last_activity_date: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export function useProgress() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setProgress(data as UserProgress);
    }
  }, [user]);

  const fetchBadges = useCallback(async () => {
    const { data, error } = await supabase
      .from('badges')
      .select('*');
    
    if (data) {
      setBadges(data as Badge[]);
    }
  }, []);

  const fetchEarnedBadges = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', user.id);
    
    if (data) {
      setEarnedBadges(data.map(ub => ({
        ...ub,
        badge: ub.badge as Badge
      })));
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchProgress(), fetchBadges(), fetchEarnedBadges()]);
      setIsLoading(false);
    };
    
    if (user) {
      loadData();
    }
  }, [user, fetchProgress, fetchBadges, fetchEarnedBadges]);

  const updateStreak = useCallback(async () => {
    if (!user) return;
    
    const { error } = await supabase.rpc('update_user_streak', { p_user_id: user.id });
    
    if (!error) {
      await fetchProgress();
    }
  }, [user, fetchProgress]);

  const incrementProgress = useCallback(async (field: 'lessons_completed' | 'practice_sessions' | 'signs_learned', amount = 1) => {
    if (!user || !progress) return;
    
    const newValue = (progress[field] || 0) + amount;
    
    const { error } = await supabase
      .from('user_progress')
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    
    if (!error) {
      setProgress(prev => prev ? { ...prev, [field]: newValue } : null);
      await updateStreak();
      await checkAndAwardBadges();
    }
  }, [user, progress, updateStreak]);

  const addWatchTime = useCallback(async (minutes: number) => {
    if (!user || !progress) return;
    
    const newTotal = (progress.total_watch_time || 0) + minutes;
    
    const { error } = await supabase
      .from('user_progress')
      .update({ total_watch_time: newTotal, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    
    if (!error) {
      setProgress(prev => prev ? { ...prev, total_watch_time: newTotal } : null);
    }
  }, [user, progress]);

  const checkAndAwardBadges = useCallback(async () => {
    if (!user || !progress) return;
    
    const earnedBadgeIds = new Set(earnedBadges.map(eb => eb.badge_id));
    
    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue;
      
      let earned = false;
      
      switch (badge.requirement_type) {
        case 'lessons_completed':
          earned = progress.lessons_completed >= badge.requirement_value;
          break;
        case 'practice_sessions':
          earned = progress.practice_sessions >= badge.requirement_value;
          break;
        case 'signs_learned':
          earned = progress.signs_learned >= badge.requirement_value;
          break;
        case 'current_streak':
          earned = progress.current_streak >= badge.requirement_value;
          break;
        case 'total_watch_time':
          earned = progress.total_watch_time >= badge.requirement_value;
          break;
      }
      
      if (earned) {
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: user.id, badge_id: badge.id });
        
        if (!error) {
          toast({
            title: "🏆 Badge Earned!",
            description: `You earned the "${badge.name}" badge!`,
          });
          await fetchEarnedBadges();
        }
      }
    }
  }, [user, progress, badges, earnedBadges, toast, fetchEarnedBadges]);

  return {
    progress,
    badges,
    earnedBadges,
    isLoading,
    updateStreak,
    incrementProgress,
    addWatchTime,
    checkAndAwardBadges,
    refetch: () => Promise.all([fetchProgress(), fetchBadges(), fetchEarnedBadges()]),
  };
}
