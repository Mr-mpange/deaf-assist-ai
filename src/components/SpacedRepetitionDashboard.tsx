import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, AlertTriangle, Star, Clock, RotateCcw, Trash2 } from 'lucide-react';
import { getSRSStats, resetSRSData, type SRSCard } from '@/lib/spacedRepetition';
import { cn } from '@/lib/utils';

export function SpacedRepetitionDashboard({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState(getSRSStats());

  useEffect(() => {
    const interval = setInterval(() => setStats(getSRSStats()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    if (confirm('Reset all spaced repetition data? This cannot be undone.')) {
      resetSRSData();
      setStats(getSRSStats());
    }
  };

  const formatNextReview = (card: SRSCard) => {
    const diff = card.nextReview - Date.now();
    if (diff <= 0) return 'Due now';
    const hours = Math.floor(diff / (3600 * 1000));
    if (hours < 1) return `${Math.ceil(diff / 60000)}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalCards}</p>
            <p className="text-xs text-muted-foreground">Signs Tracked</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.dueNow}</p>
            <p className="text-xs text-muted-foreground">Due for Review</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.struggling.length}</p>
            <p className="text-xs text-muted-foreground">Struggling</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.mastered.length}</p>
            <p className="text-xs text-muted-foreground">Mastered</p>
          </CardContent>
        </Card>
      </div>

      {/* Struggling Signs */}
      {stats.struggling.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Signs to Focus On
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.struggling.slice(0, 5).map(card => {
                const accuracy = Math.round((card.totalCorrect / card.totalAttempts) * 100);
                return (
                  <div key={card.sign} className="flex items-center justify-between p-2 rounded bg-background/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm w-16">{card.sign}</span>
                      <Progress value={accuracy} className="w-20 h-2" />
                      <span className="text-xs text-muted-foreground">{accuracy}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{card.totalAttempts} tries</span>
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatNextReview(card)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mastered Signs */}
      {stats.mastered.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Mastered Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.mastered.map(card => (
                <Badge key={card.sign} variant="default" className="text-xs">
                  {card.sign} 🔥{card.streak}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Cards */}
      {stats.allCards.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              All Tracked Signs ({stats.allCards.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground">
              <Trash2 className="w-3 h-3 mr-1" /> Reset
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {stats.allCards.map(card => {
                const accuracy = card.totalAttempts > 0 ? Math.round((card.totalCorrect / card.totalAttempts) * 100) : 0;
                const isDue = Date.now() >= card.nextReview;
                return (
                  <div key={card.sign} className={cn(
                    'flex items-center justify-between p-2 rounded text-xs',
                    isDue ? 'bg-destructive/10' : 'bg-muted/50'
                  )}>
                    <span className="font-medium">{card.sign}</span>
                    <div className="flex items-center gap-1">
                      <span className={cn(accuracy >= 70 ? 'text-primary' : 'text-destructive')}>{accuracy}%</span>
                      <span className="text-muted-foreground">• {formatNextReview(card)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.totalCards === 0 && (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground">Complete quizzes to start building your spaced repetition profile.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
