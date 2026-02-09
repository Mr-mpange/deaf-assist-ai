import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Trophy, Flame, BookOpen, Camera, Radio, Star, 
  Calendar, TrendingUp, Award, Clock, Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface RecentActivity {
  type: 'lesson' | 'practice' | 'live';
  title: string;
  date: string;
}

export default function Profile() {
  const { user, profile } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lessonsTotal, setLessonsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // Fetch user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      setProgress(progressData);

      // Fetch badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user!.id);

      if (userBadges && userBadges.length > 0) {
        const badgeIds = userBadges.map(ub => ub.badge_id);
        const { data: badgeDetails } = await supabase
          .from('badges')
          .select('*')
          .in('id', badgeIds);

        if (badgeDetails) {
          setBadges(badgeDetails.map(b => ({
            ...b,
            earned_at: userBadges.find(ub => ub.badge_id === b.id)?.earned_at || '',
          })));
        }
      }

      // Fetch total lessons count
      const { count } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });
      setLessonsTotal(count || 0);

      // Build recent activity
      const activities: RecentActivity[] = [];

      const { data: recentLessons } = await supabase
        .from('lesson_progress')
        .select('lesson_id, updated_at')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (recentLessons) {
        for (const lp of recentLessons) {
          const { data: lesson } = await supabase
            .from('lessons')
            .select('title')
            .eq('id', lp.lesson_id)
            .single();
          activities.push({
            type: 'lesson',
            title: lesson?.title || 'Lesson',
            date: lp.updated_at,
          });
        }
      }

      const { data: recentPractice } = await supabase
        .from('practice_sessions')
        .select('created_at, signs_practiced')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentPractice) {
        recentPractice.forEach(ps => {
          activities.push({
            type: 'practice',
            title: `Practiced ${ps.signs_practiced?.length || 0} signs`,
            date: ps.created_at,
          });
        });
      }

      const { data: recentSessions } = await supabase
        .from('session_participants')
        .select('joined_at, session_id')
        .eq('user_id', user!.id)
        .order('joined_at', { ascending: false })
        .limit(3);

      if (recentSessions) {
        for (const sp of recentSessions) {
          const { data: session } = await supabase
            .from('live_sessions')
            .select('title')
            .eq('id', sp.session_id)
            .single();
          activities.push({
            type: 'live',
            title: session?.title || 'Live Session',
            date: sp.joined_at,
          });
        }
      }

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 8));

    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setIsLoading(false);
  };

  const completionPct = lessonsTotal > 0 && progress
    ? Math.round((progress.lessons_completed / lessonsTotal) * 100)
    : 0;

  const userName = profile?.name || user?.email?.split('@')[0] || 'User';

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson': return <BookOpen className="w-4 h-4 text-primary" />;
      case 'practice': return <Camera className="w-4 h-4 text-secondary" />;
      case 'live': return <Radio className="w-4 h-4 text-accent" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const badgeIconMap: Record<string, string> = {
    '🏆': '🏆', '⭐': '⭐', '🔥': '🔥', '📚': '📚', '🎯': '🎯',
    '💪': '💪', '🌟': '🌟', '👏': '👏', '🎓': '🎓', '🤟': '🤟',
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-primary p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-glow">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary-foreground">{userName}</h1>
              <p className="text-primary-foreground/70 text-sm">{user?.email}</p>
              <div className="flex items-center gap-4 mt-2">
                {progress?.current_streak > 0 && (
                  <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                    <Flame className="w-3 h-3 mr-1" /> {progress.current_streak} day streak
                  </Badge>
                )}
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                  <Star className="w-3 h-3 mr-1" /> {progress?.signs_learned || 0} signs learned
                </Badge>
              </div>
            </div>
            <Link to="/leaderboard">
              <Button variant="secondary" size="sm">
                <Trophy className="w-4 h-4 mr-1" /> Leaderboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lessons Done', value: progress?.lessons_completed || 0, icon: BookOpen, color: 'text-primary' },
            { label: 'Practice Sessions', value: progress?.practice_sessions || 0, icon: Camera, color: 'text-secondary' },
            { label: 'Signs Learned', value: progress?.signs_learned || 0, icon: Target, color: 'text-accent' },
            { label: 'Longest Streak', value: `${progress?.longest_streak || 0}d`, icon: Flame, color: 'text-destructive' },
          ].map((stat, i) => (
            <Card key={i} className="border-border/50 shadow-card hover:-translate-y-1 transition-transform">
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Progress & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Progress */}
            <Card className="border-border/50 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Course Completion</span>
                    <span className="font-medium">{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress?.lessons_completed || 0} of {lessonsTotal} lessons completed
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Total Watch Time</span>
                    <span className="font-medium">{progress?.total_watch_time || 0} min</span>
                  </div>
                  <Progress value={Math.min(100, (progress?.total_watch_time || 0) / 5)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/50 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity yet. Start learning!</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        {getActivityIcon(a.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{a.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Badges & Streaks */}
          <div className="space-y-6">
            {/* Streak Card */}
            <Card className="border-border/50 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-destructive" />
                  Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-5xl font-extrabold text-gradient mb-1">
                    {progress?.current_streak || 0}
                  </div>
                  <p className="text-muted-foreground text-sm">Current Streak (days)</p>
                  <div className="flex justify-center gap-1 mt-4">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const active = i < (progress?.current_streak || 0) % 7 || (progress?.current_streak || 0) >= 7;
                      return (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Best: {progress?.longest_streak || 0} days
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            <Card className="border-border/50 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-secondary" />
                  Badges ({badges.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <div className="text-center py-6">
                    <Award className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No badges yet</p>
                    <p className="text-xs text-muted-foreground">Complete lessons and practice to earn badges!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {badges.map((badge) => (
                      <div key={badge.id} className="text-center group cursor-default">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {badge.icon}
                        </div>
                        <p className="text-xs font-medium mt-1 truncate">{badge.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/50 shadow-card">
              <CardContent className="p-4 space-y-2">
                <Link to="/practice" className="block">
                  <Button variant="gradient" size="sm" className="w-full justify-start">
                    <Camera className="w-4 h-4 mr-2" /> Start Practice
                  </Button>
                </Link>
                <Link to="/lessons" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" /> Browse Lessons
                  </Button>
                </Link>
                <Link to="/leaderboard" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Trophy className="w-4 h-4 mr-2" /> View Leaderboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
