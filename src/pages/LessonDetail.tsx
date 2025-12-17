import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  User, 
  Play, 
  BookOpen,
  Camera,
  Share2,
  Heart,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  thumbnail_url?: string;
  video_url?: string;
  created_at: string;
  author_id: string;
  views?: number;
}

export default function LessonDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [relatedLessons, setRelatedLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchLesson(id);
    }
  }, [id]);

  const fetchLesson = async (lessonId: string) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      setLesson(data);

      // Fetch related lessons
      if (data) {
        const { data: related } = await supabase
          .from('lessons')
          .select('*')
          .eq('category', data.category)
          .neq('id', lessonId)
          .limit(2);
        
        setRelatedLessons(related || []);
      }

      // Fetch user's progress for this lesson
      if (user) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('progress_percentage, completed')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (progressData) {
          setProgress(progressData.progress_percentage || 0);
          setIsCompleted(progressData.completed || false);
        }
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (progressPercentage: number) => {
    if (!user || !id) return;

    try {
      const completed = progressPercentage >= 90;

      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: id,
          progress_percentage: progressPercentage,
          completed: completed,
          last_accessed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id'
        });

      setProgress(progressPercentage);
      setIsCompleted(completed);

      if (completed && !isCompleted) {
        toast({
          title: "Lesson Completed!",
          description: "Great job! You've finished this lesson.",
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const progressPercentage = (video.currentTime / video.duration) * 100;

    // Update progress in state immediately
    setProgress(Math.round(progressPercentage));

    // Debounce database updates (every 5 seconds)
    if (progressUpdateTimeoutRef.current) {
      clearTimeout(progressUpdateTimeoutRef.current);
    }

    progressUpdateTimeoutRef.current = setTimeout(() => {
      updateProgress(Math.round(progressPercentage));
    }, 5000);
  };

  const handleVideoEnded = () => {
    updateProgress(100);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

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
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
              {lesson.video_url ? (
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-full"
                  poster={lesson.thumbnail_url}
                  preload="metadata"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                >
                  <source src={lesson.video_url} type="video/mp4" />
                  <source src={lesson.video_url} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              ) : lesson.thumbnail_url ? (
                <>
                  <img
                    src={lesson.thumbnail_url}
                    alt={lesson.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Play className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Video not available</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No video available</p>
                  </div>
                </div>
              )}
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
                <span>Instructor</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>{lesson.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="w-5 h-5" />
                <span>{lesson.views?.toLocaleString() || 0} views</span>
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
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  {isCompleted ? (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="w-4 h-4" />
                      <p className="text-sm font-medium">Lesson completed!</p>
                    </div>
                  ) : progress > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Keep watching to complete this lesson
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Start watching to track your progress
                    </p>
                  )}
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
                      {related.thumbnail_url ? (
                        <img
                          src={related.thumbnail_url}
                          alt={related.title}
                          className="w-24 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                      )}
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
