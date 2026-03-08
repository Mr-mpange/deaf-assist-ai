import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Timer, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  best_score: number;
  best_total: number;
  best_pct: number;
  total_quizzes: number;
  best_difficulty: string;
  best_timed: boolean;
}

interface QuizLeaderboardProps {
  className?: string;
}

export function QuizLeaderboard({ className }: QuizLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch all quiz scores with profiles
      const { data: scores } = await supabase
        .from('quiz_scores')
        .select('user_id, score, total_questions, timed, difficulty, completed_at')
        .eq('quiz_type', 'fingerspelling')
        .order('completed_at', { ascending: false });

      if (!scores || scores.length === 0) {
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(scores.map(s => s.user_id))];

      // Fetch profile names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.name; });

      // Aggregate per user: best score %, total quizzes
      const userMap = new Map<string, LeaderboardEntry>();
      for (const s of scores) {
        const pct = s.total_questions > 0 ? (s.score / s.total_questions) * 100 : 0;
        const existing = userMap.get(s.user_id);
        if (!existing) {
          userMap.set(s.user_id, {
            user_id: s.user_id,
            user_name: nameMap[s.user_id] || 'Student',
            best_score: s.score,
            best_total: s.total_questions,
            best_pct: pct,
            total_quizzes: 1,
            best_difficulty: s.difficulty,
            best_timed: s.timed,
          });
        } else {
          existing.total_quizzes++;
          if (pct > existing.best_pct) {
            existing.best_score = s.score;
            existing.best_total = s.total_questions;
            existing.best_pct = pct;
            existing.best_difficulty = s.difficulty;
            existing.best_timed = s.timed;
          }
        }
      }

      const sorted = [...userMap.values()].sort((a, b) => {
        if (b.best_pct !== a.best_pct) return b.best_pct - a.best_pct;
        return b.total_quizzes - a.total_quizzes;
      });

      setEntries(sorted);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-primary" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-accent-foreground" />;
    return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{rank + 1}</span>;
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-primary/20 text-primary';
    if (d === 'hard') return 'bg-destructive/20 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className={cn('border-border/50 shadow-card', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Fingerspelling Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading leaderboard...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No quiz scores yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  entry.user_id === currentUserId
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/30 hover:bg-muted/50'
                )}
              >
                <div className="flex items-center justify-center w-6">
                  {getRankIcon(i)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {entry.user_name}
                    {entry.user_id === currentUserId && (
                      <span className="text-primary text-xs ml-1">(you)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={cn('text-xs py-0', difficultyColor(entry.best_difficulty))}>
                      {entry.best_difficulty}
                    </Badge>
                    {entry.best_timed && (
                      <span className="text-xs text-primary flex items-center gap-0.5">
                        <Timer className="w-3 h-3" />
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {entry.total_quizzes} quiz{entry.total_quizzes !== 1 ? 'zes' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {Math.round(entry.best_pct)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.best_score}/{entry.best_total}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
