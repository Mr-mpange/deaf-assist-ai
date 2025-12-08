import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/cards/StatsCard';
import { LessonCard } from '@/components/cards/LessonCard';
import { mockLessons, mockSubmissions, mockLiveSessions, mockAnalytics } from '@/data/mockData';
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

function StudentDashboard() {
  const recentLessons = mockLessons.slice(0, 3);
  const upcomingSession = mockLiveSessions.find(s => s.status === 'scheduled');

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
          value="12"
          description="3 this week"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Practice Sessions"
          value="28"
          description="+5 from last week"
          icon={Camera}
          trend={{ value: 12, positive: true }}
        />
        <StatsCard
          title="Live Classes Joined"
          value="5"
          icon={Radio}
        />
        <StatsCard
          title="Learning Streak"
          value="7 days"
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
                  with {upcomingSession.hostName}
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
  const myLessons = mockLessons.filter(l => l.authorId === '2').slice(0, 2);
  const pendingSubmissions = mockSubmissions.filter(s => s.status === 'pending');

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
          value="8"
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          title="Total Views"
          value="4.2K"
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
          value="12"
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
                      <p className="font-medium text-sm">{sub.studentName}</p>
                      <p className="text-xs text-muted-foreground">{sub.lessonTitle}</p>
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
          value={mockAnalytics.totalUsers.toString()}
          trend={{ value: 8, positive: true }}
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Total Lessons"
          value={mockAnalytics.totalLessons.toString()}
          icon={BookOpen}
        />
        <StatsCard
          title="Total Views"
          value={mockAnalytics.totalViews.toLocaleString()}
          icon={Eye}
          variant="secondary"
        />
        <StatsCard
          title="Completion Rate"
          value={`${mockAnalytics.completionRate}%`}
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
            {mockAnalytics.recentActivity.slice(-4).reverse().map((day, i) => (
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
  const { user } = useAuth();

  return (
    <DashboardLayout>
      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'teacher' && <TeacherDashboard />}
      {user?.role === 'student' && <StudentDashboard />}
    </DashboardLayout>
  );
}
