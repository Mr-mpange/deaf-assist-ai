import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Trophy, Medal, Award, TrendingUp, Flame, BookOpen, Radio, Camera, Star, Swords, Crown, Clock } from 'lucide-react';
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

interface MultiplayerStat {
  user_id: string;
  user_name: string;
  total_wins: number;
  total_matches: number;
  total_score: number;
  avg_response_time_ms: number;
  win_rate: number;
}

type TimeRange = 'all' | 'month' | 'week';

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [multiplayerStats, setMultiplayerStats] = useState<MultiplayerStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchMultiplayerLeaderboard();
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

  const fetchMultiplayerLeaderboard = async () => {
    try {
      const { data } = await supabase
        .from('match_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data) return;

      // Aggregate per user
      const userMap = new Map<string, MultiplayerStat>();
      data.forEach(r => {
        const existing = userMap.get(r.user_id) || {
          user_id: r.user_id,
          user_name: r.user_name,
          total_wins: 0,
          total_matches: 0,
          total_score: 0,
          avg_response_time_ms: 0,
          win_rate: 0,
        };
        existing.total_matches++;
        existing.total_score += r.score;
        if (r.is_winner) existing.total_wins++;
        existing.avg_response_time_ms += (r.avg_response_time_ms || 0);
        userMap.set(r.user_id, existing);
      });

      const stats = Array.from(userMap.values()).map(s => ({
        ...s,
        avg_response_time_ms: s.total_matches > 0 ? Math.round(s.avg_response_time_ms / s.total_matches) : 0,
        win_rate: s.total_matches > 0 ? Math.round((s.total_wins / s.total_matches) * 100) : 0,
      })).sort((a, b) => b.total_wins - a.total_wins || b.win_rate - a.win_rate);

      setMultiplayerStats(stats);
    } catch (err) {
      console.error('Error fetching multiplayer leaderboard:', err);
    }
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

        <Tabs defaultValue="engagement" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="engagement" className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Engagement
            </TabsTrigger>
            <TabsTrigger value="multiplayer" className="flex items-center gap-1.5">
              <Swords className="w-4 h-4" /> 1v1 Battles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="mt-4">
            {/* Scoring Info */}
            <Card className="border-border/50 shadow-card mb-4">
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
          </TabsContent>

          <TabsContent value="multiplayer" className="mt-4">
            <Card className="border-border/50 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  1v1 Battle Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {multiplayerStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No multiplayer matches yet. Play a 1v1 battle in Practice!</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead className="text-center">Wins</TableHead>
                            <TableHead className="text-center">Matches</TableHead>
                            <TableHead className="text-center">Win Rate</TableHead>
                            <TableHead className="text-center">Total Score</TableHead>
                            <TableHead className="text-center">Avg Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {multiplayerStats.map((stat, i) => (
                            <TableRow key={stat.user_id} className={stat.user_id === user?.id ? 'bg-primary/5' : ''}>
                              <TableCell>
                                {i === 0 ? <Crown className="w-5 h-5 text-primary" /> :
                                 i === 1 ? <Medal className="w-5 h-5 text-muted-foreground" /> :
                                 i === 2 ? <Award className="w-5 h-5 text-secondary-foreground" /> :
                                 <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {stat.user_name}
                                  {stat.user_id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-primary">{stat.total_wins}</TableCell>
                              <TableCell className="text-center">{stat.total_matches}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={stat.win_rate >= 60 ? "default" : stat.win_rate >= 40 ? "secondary" : "outline"}>
                                  {stat.win_rate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">{stat.total_score}</TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                <span className="flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {(stat.avg_response_time_ms / 1000).toFixed(1)}s
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile card layout */}
                    <div className="md:hidden space-y-3">
                      {multiplayerStats.map((stat, i) => (
                        <div key={stat.user_id} className={`flex items-center gap-3 p-3 rounded-lg border ${stat.user_id === user?.id ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50'}`}>
                          <div className="shrink-0">
                            {i === 0 ? <Crown className="w-6 h-6 text-primary" /> :
                             i === 1 ? <Medal className="w-6 h-6 text-muted-foreground" /> :
                             i === 2 ? <Award className="w-6 h-6 text-secondary-foreground" /> :
                             <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{i + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{stat.user_name}</p>
                              {stat.user_id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="font-bold text-primary">{stat.total_wins}W</span>
                              <span>{stat.total_matches} matches</span>
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{(stat.avg_response_time_ms / 1000).toFixed(1)}s</span>
                            </div>
                          </div>
                          <Badge variant={stat.win_rate >= 60 ? "default" : stat.win_rate >= 40 ? "secondary" : "outline"} className="shrink-0">
                            {stat.win_rate}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
