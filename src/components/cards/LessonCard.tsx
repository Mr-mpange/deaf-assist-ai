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
}
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, Eye, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LessonCardProps {
  lesson: Lesson;
  className?: string;
}

export function LessonCard({ lesson, className }: LessonCardProps) {
  const difficultyColors = {
    beginner: 'bg-success/10 text-success border-success/20',
    intermediate: 'bg-warning/10 text-warning border-warning/20',
    advanced: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  // Default thumbnails based on category
  const getDefaultThumbnail = (category: string) => {
    const defaults = {
      'alphabet': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=225&fit=crop&crop=center',
      'numbers': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=225&fit=crop&crop=center',
      'phrases': 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=225&fit=crop&crop=center',
      'grammar': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=225&fit=crop&crop=center',
      'advanced': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop&crop=center',
      'conversation': 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=225&fit=crop&crop=center'
    };
    return defaults[category.toLowerCase()] || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=225&fit=crop&crop=center';
  };

  const thumbnailUrl = lesson.thumbnail_url || getDefaultThumbnail(lesson.category);

  return (
    <Card className={cn(
      "group overflow-hidden border-border/50 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1",
      className
    )}>
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnailUrl}
          alt={lesson.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // Fallback to a solid color background if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.style.background = 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Link 
          to={`/lessons/${lesson.id}`}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-glow animate-scale-in">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </Link>
        <Badge 
          variant="outline" 
          className={cn(
            "absolute top-3 right-3 border backdrop-blur-sm",
            difficultyColors[lesson.difficulty]
          )}
        >
          {lesson.difficulty}
        </Badge>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div>
          <Badge variant="secondary" className="mb-2 text-xs">
            {lesson.category}
          </Badge>
          <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {lesson.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {lesson.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{lesson.authorName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{lesson.duration}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{lesson.views}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
