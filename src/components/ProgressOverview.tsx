import { useProgress } from '@/hooks/useProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Camera, 
  Star,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  flame: Flame,
  book: BookOpen,
  camera: Camera,
  star: Star,
  clock: Clock,
  zap: Zap,
};

export function ProgressOverview() {
  const { progress, earnedBadges, badges, isLoading } = useProgress();

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) return null;

  const nextBadge = badges.find(badge => {
    const earned = earnedBadges.some(eb => eb.badge_id === badge.id);
    if (earned) return false;
    
    let current = 0;
    switch (badge.requirement_type) {
      case 'lessons_completed':
        current = progress.lessons_completed;
        break;
      case 'practice_sessions':
        current = progress.practice_sessions;
        break;
      case 'signs_learned':
        current = progress.signs_learned;
        break;
      case 'current_streak':
        current = progress.current_streak;
        break;
    }
    
    return current < badge.requirement_value;
  });

  const getProgressToNextBadge = () => {
    if (!nextBadge) return { current: 0, target: 0, percent: 100 };
    
    let current = 0;
    switch (nextBadge.requirement_type) {
      case 'lessons_completed':
        current = progress.lessons_completed;
        break;
      case 'practice_sessions':
        current = progress.practice_sessions;
        break;
      case 'signs_learned':
        current = progress.signs_learned;
        break;
      case 'current_streak':
        current = progress.current_streak;
        break;
    }
    
    return {
      current,
      target: nextBadge.requirement_value,
      percent: Math.min(100, (current / nextBadge.requirement_value) * 100),
    };
  };

  const badgeProgress = getProgressToNextBadge();

  return (
    <div className="space-y-6">
      {/* Streak Card */}
      <Card className="border-border/50 shadow-card bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold">{progress.current_streak} days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Longest Streak</p>
              <p className="text-xl font-semibold">{progress.longest_streak} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4 text-center">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{progress.lessons_completed}</p>
            <p className="text-xs text-muted-foreground">Lessons</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4 text-center">
            <Camera className="w-6 h-6 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold">{progress.practice_sessions}</p>
            <p className="text-xs text-muted-foreground">Practice</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{progress.signs_learned}</p>
            <p className="text-xs text-muted-foreground">Signs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-card">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{progress.total_watch_time}</p>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Badge Progress */}
      {nextBadge && (
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Next Badge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                {(() => {
                  const IconComponent = iconMap[nextBadge.icon] || Trophy;
                  return <IconComponent className="w-6 h-6 text-primary" />;
                })()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{nextBadge.name}</p>
                <p className="text-sm text-muted-foreground">{nextBadge.description}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{badgeProgress.current} / {badgeProgress.target}</span>
              </div>
              <Progress value={badgeProgress.percent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Earned Badges ({earnedBadges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {earnedBadges.map((userBadge) => {
                const badge = userBadge.badge;
                if (!badge) return null;
                const IconComponent = iconMap[badge.icon] || Trophy;
                
                return (
                  <div
                    key={userBadge.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
                    title={badge.description}
                  >
                    <IconComponent className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
