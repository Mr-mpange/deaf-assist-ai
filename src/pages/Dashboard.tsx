import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/cards/StatsCard';
import { LessonCard } from '@/components/cards/LessonCard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Play, 
  Users, 
  TrendingUp, 
  Clock, 
  Video,
  Radio,
  ArrowRight,
  Camera,
  Upload,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  thumbnail_url?: string;
  created_at: string;
  author_id: string;
  views?: number;
  authorName?: string;
}

interface LiveSession {
  id: string;
  title: string;
  status: string;
  scheduled_at: string;
  host_name?: string;
}

interface Submission {
  id: string;
  status: string;
  student_name?: string;
  lesson_title?: string;
  created_at: string;
}

interface DashboardStats {
  lessonsCompleted: number;
  practiceSessions: number;
  totalUsers: number;
  totalLessons: number;
  totalViews: number;
  completionRate: number;
}

function StudentDashboard() {
  const [recentLessons, setRecentLessons] = useState<Lesson[]>([]);
  const [upcomingSession, setUpcomingSession] = useState<LiveSession | null>(null);
  const [stats, setStats] = useState<Partial<DashboardStats>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      // Fetch recent lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch upcoming live session
      const { data: sessionsData } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      // Fetch user progress stats
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('completed')
        .eq('user_id', user?.id);

      const { data: practiceData } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('user_id', user?.id);

      // Fetch total lessons count
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      // Fetch live sessions joined by student
      const { count: liveClassesJoined } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setRecentLessons(lessonsData || []);
      setUpcomingSession(sessionsData?.[0] || null);
      setStats({
        lessonsCompleted: progressData?.filter(p => p.completed).length || 0,
        practiceSessions: practiceData?.length || 0,
        totalUsers: liveClassesJoined || 0,
        totalLessons: totalLessons || 0
      });
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back! 👋</h1>
        <p className="text-muted-foreground mt-1">Continue your sign language journey</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Lessons Completed"
          value={stats.lessonsCompleted?.toString() || "0"}
          description="Keep learning!"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Practice Sessions"
          value={stats.practiceSessions?.toString() || "0"}
          description="Practice makes perfect"
          icon={Camera}
          trend={{ value: 12, positive: true }}
        />
        <StatsCard
          title="Live Classes Joined"
          value={stats.totalUsers?.toString() || "0"}
          icon={Radio}
        />
        <StatsCard
          title="Learning Streak"
          value={stats.totalLessons?.toString() || "0"}
          description="Keep it up!"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Lessons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Continue Learning</h2>
            <Link to="/lessons">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {recentLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/practice" className="block">
                <Button variant="gradient" className="w-full justify-start">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Practice Session
                </Button>
              </Link>
              <Link to="/lessons" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Lessons
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming Session */}
          {upcomingSession && (
            <Card className="border-border/50 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  Upcoming Live Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{upcomingSession.title}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  with {upcomingSession.host_name || 'Instructor'}
                </p>
                <Link to="/live">
                  <Button size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const [myLessons, setMyLessons] = useState<Lesson[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Partial<DashboardStats>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Fetch teacher's lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('author_id', user?.id)
        .order('created_at', { ascending: false });

      // Fetch pending submissions for teacher's lessons
      const lessonIds = lessonsData?.map(l => l.id) || [];
      
      let submissionsData: any[] = [];
      if (lessonIds.length > 0 && Array.isArray(lessonIds)) {
        const { data } = await supabase
          .from('submissions')
          .select('id, status, created_at, student_id, lesson_id')
          .eq('status', 'pending')
          .in('lesson_id', lessonIds)
          .order('created_at', { ascending: false });
        
        submissionsData = data || [];
        
        // Fetch student names and lesson titles separately
        for (const sub of submissionsData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', sub.student_id)
            .single();
          
          const { data: lesson } = await supabase
            .from('lessons')
            .select('title')
            .eq('id', sub.lesson_id)
            .single();
          
          (sub as any).profiles = profile;
          (sub as any).lessons = lesson;
        }
      }

      // Fetch teacher's live sessions count (this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: liveSessionsCount } = await supabase
        .from('live_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user?.id)
        .gte('created_at', startOfMonth.toISOString());

      // Transform submissions data
      const transformedSubmissions = submissionsData?.map(sub => ({
        id: sub.id,
        status: sub.status,
        created_at: sub.created_at,
        student_name: (sub.profiles as any)?.name || 'Unknown Student',
        lesson_title: (sub.lessons as any)?.title || 'Unknown Lesson'
      })) || [];

      // Calculate teacher stats
      const totalLessons = lessonsData?.length || 0;
      const totalViews = lessonsData?.reduce((sum, lesson) => sum + (lesson.views || 0), 0) || 0;

      setMyLessons(lessonsData?.slice(0, 2) || []);
      setPendingSubmissions(transformedSubmissions);
      setStats({
        totalLessons,
        totalViews,
        completionRate: liveSessionsCount || 0
      });
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Teacher Dashboard 📚</h1>
        <p className="text-muted-foreground mt-1">Manage your lessons and students</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Lessons"
          value={stats.totalLessons?.toString() || "0"}
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Total Views"
          value={stats.totalViews?.toLocaleString() || "0"}
          trend={{ value: 15, positive: true }}
          icon={Eye}
        />
        <StatsCard
          title="Pending Reviews"
          value={pendingSubmissions.length.toString()}
          description="Needs attention"
          icon={Video}
          variant="secondary"
        />
        <StatsCard
          title="Live Sessions"
          value={stats.completionRate?.toString() || "0"}
          description="This month"
          icon={Radio}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Lessons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Lessons</h2>
            <Link to="/uploads">
              <Button variant="ghost" size="sm">
                Manage <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {myLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>

        {/* Quick Actions & Pending */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/uploads" className="block">
                <Button variant="gradient" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Lesson
                </Button>
              </Link>
              <Link to="/live" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Radio className="w-4 h-4 mr-2" />
                  Start Live Session
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pending Submissions */}
          <Card className="border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSubmissions.length > 0 ? (
                pendingSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{sub.student_name}</p>
                      <p className="text-xs text-muted-foreground">{sub.lesson_title}</p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending submissions
                </p>
              )}
              <Link to="/submissions">
                <Button variant="ghost" size="sm" className="w-full">
                  View All Submissions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    lessonsCompleted: 0,
    practiceSessions: 0,
    totalUsers: 0,
    totalLessons: 0,
    totalViews: 0,
    completionRate: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total lessons
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      // Fetch lesson progress for completion rate
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('completed');

      const completedLessons = progressData?.filter(p => p.completed).length || 0;
      const totalProgress = progressData?.length || 1;
      const completionRate = Math.round((completedLessons / totalProgress) * 100);

      // Fetch recent activity (last 4 days)
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const { data: recentLessons } = await supabase
        .from('lesson_progress')
        .select('created_at')
        .gte('created_at', fourDaysAgo.toISOString());

      // Group by date
      const activityByDate: { [key: string]: number } = {};
      for (let i = 3; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        activityByDate[dateStr] = 0;
      }

      recentLessons?.forEach(lesson => {
        const date = lesson.created_at.split('T')[0];
        if (activityByDate[date] !== undefined) {
          activityByDate[date]++;
        }
      });

      const activity = Object.entries(activityByDate).map(([date, lessons]) => ({
        date,
        lessons,
        practice: Math.floor(lessons * 0.7) // Estimate practice sessions
      }));

      setStats({
        lessonsCompleted: completedLessons,
        practiceSessions: recentLessons?.length || 0,
        totalUsers: totalUsers || 0,
        totalLessons: totalLessons || 0,
        totalViews: recentLessons?.length || 0,
        completionRate
      });
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard ⚙️</h1>
        <p className="text-muted-foreground mt-1">System overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers?.toString() || "0"}
          description="registered users"
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Total Lessons"
          value={stats.totalLessons?.toString() || "0"}
          icon={BookOpen}
        />
        <StatsCard
          title="Total Views"
          value={stats.totalViews?.toLocaleString() || "0"}
          icon={Eye}
          variant="secondary"
        />
        <StatsCard
          title="Completion Rate"
          value={`${stats.completionRate || 0}%`}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <Link to="/admin/users">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <Users className="w-6 h-6 mb-2" />
                Manage Users
              </Button>
            </Link>
            <Link to="/lessons">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <BookOpen className="w-6 h-6 mb-2" />
                Manage Lessons
              </Button>
            </Link>
            <Link to="/admin/analytics">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <TrendingUp className="w-6 h-6 mb-2" />
                View Analytics
              </Button>
            </Link>
            <Link to="/live">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <Radio className="w-6 h-6 mb-2" />
                Live Sessions
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((day, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{day.date}</span>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {day.lessons}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="w-4 h-4 text-secondary" />
                    {day.practice}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'teacher' && <TeacherDashboard />}
      {(role === 'student' || !role) && <StudentDashboard />}
    </DashboardLayout>
  );
}
