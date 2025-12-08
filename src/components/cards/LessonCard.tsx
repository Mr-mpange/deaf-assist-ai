import { Lesson } from '@/data/mockData';
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

  return (
    <Card className={cn(
      "group overflow-hidden border-border/50 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1",
      className
    )}>
      <div className="relative aspect-video overflow-hidden">
        <img
          src={lesson.thumbnailUrl}
          alt={lesson.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
