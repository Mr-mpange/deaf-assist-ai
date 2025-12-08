import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockLessons } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  User, 
  Play, 
  BookOpen,
  Camera,
  Share2,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LessonDetail() {
  const { id } = useParams();
  const lesson = mockLessons.find(l => l.id === id);

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Lesson Not Found</h2>
          <p className="text-muted-foreground mb-4">The lesson you're looking for doesn't exist.</p>
          <Link to="/lessons">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lessons
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const difficultyColors = {
    beginner: 'bg-success/10 text-success border-success/20',
    intermediate: 'bg-warning/10 text-warning border-warning/20',
    advanced: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const relatedLessons = mockLessons
    .filter(l => l.category === lesson.category && l.id !== lesson.id)
    .slice(0, 2);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Link to="/lessons">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lessons
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-foreground/5 shadow-lg">
              <img
                src={lesson.thumbnailUrl}
                alt={lesson.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
                <button className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-glow hover:scale-105 transition-transform">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                </button>
              </div>
            </div>

            {/* Lesson Info */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Badge variant="secondary">{lesson.category}</Badge>
                <Badge 
                  variant="outline" 
                  className={cn("capitalize", difficultyColors[lesson.difficulty])}
                >
                  {lesson.difficulty}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
              <p className="text-muted-foreground text-lg">{lesson.description}</p>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-5 h-5" />
                <span>{lesson.authorName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>{lesson.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="w-5 h-5" />
                <span>{lesson.views.toLocaleString()} views</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Link to="/practice">
                <Button variant="gradient" size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Practice This Lesson
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                <Heart className="w-5 h-5 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="border-border/50 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-0 bg-gradient-primary rounded-full" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start watching to track your progress
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Related Lessons */}
            {relatedLessons.length > 0 && (
              <Card className="border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Related Lessons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedLessons.map((related) => (
                    <Link 
                      key={related.id} 
                      to={`/lessons/${related.id}`}
                      className="flex gap-3 group"
                    >
                      <img
                        src={related.thumbnailUrl}
                        alt={related.title}
                        className="w-24 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {related.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {related.duration}m • {related.difficulty}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
