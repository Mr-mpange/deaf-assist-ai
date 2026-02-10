import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart3, TrendingUp, BookOpen, Camera, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface WeeklyData {
  day: string;
  lessons: number;
  practice: number;
  signs: number;
}

interface AccuracyData {
  date: string;
  accuracy: number;
  signs: number;
}

export default function ProgressDashboard() {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [accuracyData, setAccuracyData] = useState<AccuracyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const fourWeeksAgo = new Date(now);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      // Fetch lesson progress in last 4 weeks
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('updated_at, completed')
        .eq('user_id', user!.id)
        .gte('updated_at', fourWeeksAgo.toISOString());

      // Fetch practice sessions in last 4 weeks
      const { data: practiceSessions } = await supabase
        .from('practice_sessions')
        .select('created_at, accuracy_score, signs_practiced, duration')
        .eq('user_id', user!.id)
        .gte('created_at', fourWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      // Build weekly learning trends (last 7 days)
      const weekly: WeeklyData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });

        const lessonsCount = lessonProgress?.filter(
          lp => lp.updated_at.split('T')[0] === dateStr
        ).length || 0;

        const practiceCount = practiceSessions?.filter(
          ps => ps.created_at.split('T')[0] === dateStr
        ).length || 0;

        const signsCount = practiceSessions
          ?.filter(ps => ps.created_at.split('T')[0] === dateStr)
          .reduce((sum, ps) => sum + (ps.signs_practiced?.length || 0), 0) || 0;

        weekly.push({ day: dayName, lessons: lessonsCount, practice: practiceCount, signs: signsCount });
      }
      setWeeklyData(weekly);

      // Build accuracy trend (last 4 weeks, grouped by week)
      const accuracy: AccuracyData[] = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        const weekLabel = `Week ${4 - w}`;

        const weekSessions = practiceSessions?.filter(ps => {
          const d = new Date(ps.created_at);
          return d >= weekStart && d <= weekEnd;
        }) || [];

        const avgAccuracy = weekSessions.length > 0
          ? Math.round(weekSessions.reduce((sum, ps) => sum + (Number(ps.accuracy_score) || 0), 0) / weekSessions.length)
          : 0;
        const totalSigns = weekSessions.reduce((sum, ps) => sum + (ps.signs_practiced?.length || 0), 0);

        accuracy.push({ date: weekLabel, accuracy: avgAccuracy, signs: totalSigns });
      }
      setAccuracyData(accuracy);

    } catch (error) {
      console.error('Error fetching progress data:', error);
    }
    setIsLoading(false);
  };

  const totalLessonsWeek = weeklyData.reduce((s, d) => s + d.lessons, 0);
  const totalPracticeWeek = weeklyData.reduce((s, d) => s + d.practice, 0);
  const totalSignsWeek = weeklyData.reduce((s, d) => s + d.signs, 0);

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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Progress Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Track your weekly learning trends and performance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalLessonsWeek}</p>
              <p className="text-xs text-muted-foreground">Lessons this week</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 text-center">
              <Camera className="w-6 h-6 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{totalPracticeWeek}</p>
              <p className="text-xs text-muted-foreground">Practice sessions</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{totalSignsWeek}</p>
              <p className="text-xs text-muted-foreground">Signs practiced</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Weekly Trends</TabsTrigger>
            <TabsTrigger value="accuracy">Accuracy Over Time</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card className="border-border/50 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-primary" />
                  Daily Learning Activity (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(175, 70%, 35%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(175, 70%, 35%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPractice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(180, 15%, 90%)" />
                      <XAxis dataKey="day" stroke="hsl(200, 15%, 45%)" fontSize={12} />
                      <YAxis stroke="hsl(200, 15%, 45%)" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(0, 0%, 100%)',
                          border: '1px solid hsl(180, 15%, 90%)',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="lessons"
                        stroke="hsl(175, 70%, 35%)"
                        fill="url(#colorLessons)"
                        strokeWidth={2}
                        name="Lessons"
                      />
                      <Area
                        type="monotone"
                        dataKey="practice"
                        stroke="hsl(35, 90%, 55%)"
                        fill="url(#colorPractice)"
                        strokeWidth={2}
                        name="Practice"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accuracy">
            <Card className="border-border/50 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Sign Recognition Accuracy (Last 4 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={accuracyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(180, 15%, 90%)" />
                      <XAxis dataKey="date" stroke="hsl(200, 15%, 45%)" fontSize={12} />
                      <YAxis stroke="hsl(200, 15%, 45%)" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(0, 0%, 100%)',
                          border: '1px solid hsl(180, 15%, 90%)',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="accuracy"
                        fill="hsl(175, 70%, 35%)"
                        radius={[4, 4, 0, 0]}
                        name="Accuracy %"
                      />
                      <Bar
                        dataKey="signs"
                        fill="hsl(35, 90%, 55%)"
                        radius={[4, 4, 0, 0]}
                        name="Signs Practiced"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
