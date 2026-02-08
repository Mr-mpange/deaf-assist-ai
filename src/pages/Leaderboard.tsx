import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, TrendingUp, Flame, BookOpen, Radio, Camera, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_initial: string;
  score: number;
  lessons_completed: number;
  practice_sessions: number;
  live_sessions_joined: number;
  current_streak: number;
  signs_learned: number;
}

type TimeRange = 'all' | 'month' | 'week';

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Fetch all user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*');

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name');

      // Fetch student roles only
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'student');

      const studentIds = new Set(rolesData?.map(r => r.user_id) || []);
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.name]) || []);

      // Fetch live session participation counts
      const { data: participationData } = await supabase
        .from('session_participants')
        .select('user_id');

      const sessionCounts = new Map<string, number>();
      participationData?.forEach(p => {
        sessionCounts.set(p.user_id, (sessionCounts.get(p.user_id) || 0) + 1);
      });

      // Fetch practice session counts per user
      const { data: practiceData } = await supabase
        .from('practice_sessions')
        .select('user_id');

      const practiceCounts = new Map<string, number>();
      practiceData?.forEach(p => {
        practiceCounts.set(p.user_id, (practiceCounts.get(p.user_id) || 0) + 1);
      });

      // Calculate scores
      const leaderboard: LeaderboardEntry[] = (progressData || [])
        .filter(p => studentIds.has(p.user_id))
        .map(p => {
          const liveSessions = sessionCounts.get(p.user_id) || 0;
          const practices = practiceCounts.get(p.user_id) || 0;
          const name = profileMap.get(p.user_id) || 'Unknown';

          // Engagement score formula
          const score =
            (p.lessons_completed * 10) +
            (practices * 5) +
            (liveSessions * 8) +
            (p.signs_learned * 2) +
            (p.current_streak * 3);

          return {
            rank: 0,
            user_id: p.user_id,
            name,
            avatar_initial: name.charAt(0).toUpperCase(),
            score,
            lessons_completed: p.lessons_completed,
            practice_sessions: practices,
            live_sessions_joined: liveSessions,
            current_streak: p.current_streak,
            signs_learned: p.signs_learned,
          };
        })
        .sort((a, b) => b.score - a.score)
        .map((entry, i) => ({ ...entry, rank: i + 1 }));

      setEntries(leaderboard);

      // Find current user's rank
      const me = leaderboard.find(e => e.user_id === user?.id);
      setMyRank(me || null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
    setIsLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-primary" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-6 h-6 text-secondary-foreground" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-primary/10 border-primary/30';
    if (rank === 2) return 'bg-muted/50 border-border';
    if (rank === 3) return 'bg-secondary/10 border-secondary/30';
    return 'bg-muted/30 border-border/50';
  };

  const maxScore = entries[0]?.score || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Top students ranked by engagement score
            </p>
          </div>
        </div>

        {/* My Rank Card */}
        {myRank && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {getRankIcon(myRank.rank)}
                <div className="flex-1">
                  <p className="font-semibold">Your Rank: #{myRank.rank}</p>
                  <p className="text-sm text-muted-foreground">
                    {myRank.score} points • {myRank.current_streak} day streak 🔥
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold">{myRank.lessons_completed}</p>
                    <p className="text-xs text-muted-foreground">Lessons</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{myRank.practice_sessions}</p>
                    <p className="text-xs text-muted-foreground">Practice</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{myRank.live_sessions_joined}</p>
                    <p className="text-xs text-muted-foreground">Live</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scoring Info */}
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-primary" /> Lessons: 10pts</span>
              <span className="flex items-center gap-1"><Radio className="w-4 h-4 text-primary" /> Live Sessions: 8pts</span>
              <span className="flex items-center gap-1"><Camera className="w-4 h-4 text-primary" /> Practice: 5pts</span>
              <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-primary" /> Streak: 3pts/day</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-primary" /> Signs: 2pts</span>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard List */}
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading leaderboard...</p>
            ) : entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No students yet</p>
            ) : (
              entries.slice(0, 50).map((entry) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${getRankBg(entry.rank)} ${entry.user_id === user?.id ? 'ring-2 ring-primary/50' : ''}`}
                >
                  {getRankIcon(entry.rank)}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                    {entry.avatar_initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{entry.name}</p>
                      {entry.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                      {entry.current_streak > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-destructive" />{entry.current_streak}
                        </span>
                      )}
                    </div>
                    <Progress value={(entry.score / maxScore) * 100} className="h-1.5 mt-1" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{entry.score}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
