import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetectionEntry {
  sign: string;
  confidence: number;
  timestamp: number;
}

const STORAGE_KEY = 'deaflearn-gesture-history';

function loadHistory(): DetectionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(entries: DetectionEntry[]) {
  // Keep last 500 entries
  const trimmed = entries.slice(-500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function addDetectionToHistory(sign: string, confidence: number) {
  const entries = loadHistory();
  entries.push({ sign, confidence, timestamp: Date.now() });
  saveHistory(entries);
}

export function GestureHistoryChart({ className = '' }: { className?: string }) {
  const [history, setHistory] = useState<DetectionEntry[]>([]);
  const [view, setView] = useState<'accuracy' | 'frequency'>('accuracy');

  useEffect(() => {
    setHistory(loadHistory());
    // Refresh every 5s while visible
    const interval = setInterval(() => setHistory(loadHistory()), 5000);
    return () => clearInterval(interval);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <Card className={cn('border-border/50 shadow-card', className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Detection History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No detection history yet. Start practicing to see your progress!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by sign for accuracy chart
  const signStats: Record<string, { totalConf: number; count: number; recentConf: number; recentCount: number }> = {};
  const oneDayAgo = Date.now() - 86400000;
  history.forEach(e => {
    if (!signStats[e.sign]) signStats[e.sign] = { totalConf: 0, count: 0, recentConf: 0, recentCount: 0 };
    signStats[e.sign].totalConf += e.confidence;
    signStats[e.sign].count++;
    if (e.timestamp > oneDayAgo) {
      signStats[e.sign].recentConf += e.confidence;
      signStats[e.sign].recentCount++;
    }
  });

  const accuracyData = Object.entries(signStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([sign, stats]) => ({
      sign,
      avgAccuracy: Math.round((stats.totalConf / stats.count) * 100),
      recentAccuracy: stats.recentCount ? Math.round((stats.recentConf / stats.recentCount) * 100) : 0,
      count: stats.count,
    }));

  // Timeline data (grouped by hour, last 24h)
  const hourlyData: Record<number, { count: number; totalConf: number }> = {};
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const hourKey = Math.floor((now - i * 3600000) / 3600000);
    hourlyData[hourKey] = { count: 0, totalConf: 0 };
  }
  history.filter(e => e.timestamp > oneDayAgo).forEach(e => {
    const hourKey = Math.floor(e.timestamp / 3600000);
    if (hourlyData[hourKey]) {
      hourlyData[hourKey].count++;
      hourlyData[hourKey].totalConf += e.confidence;
    }
  });

  const timelineData = Object.entries(hourlyData).map(([key, val]) => {
    const date = new Date(parseInt(key) * 3600000);
    return {
      time: `${date.getHours().toString().padStart(2, '0')}:00`,
      detections: val.count,
      accuracy: val.count ? Math.round((val.totalConf / val.count) * 100) : 0,
    };
  });

  const totalDetections = history.length;
  const overallAccuracy = Math.round((history.reduce((a, e) => a + e.confidence, 0) / history.length) * 100);
  const uniqueSigns = new Set(history.map(e => e.sign)).size;

  return (
    <Card className={cn('border-border/50 shadow-card', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Detection History
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={view === 'accuracy' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('accuracy')}
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Signs
            </Button>
            <Button
              variant={view === 'frequency' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('frequency')}
            >
              <Clock className="w-3 h-3 mr-1" />
              Timeline
            </Button>
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-lg font-bold text-primary">{totalDetections}</p>
            <p className="text-xs text-muted-foreground">Detections</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-lg font-bold text-primary">{overallAccuracy}%</p>
            <p className="text-xs text-muted-foreground">Avg Accuracy</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-lg font-bold text-primary">{uniqueSigns}</p>
            <p className="text-xs text-muted-foreground">Unique Signs</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          {view === 'accuracy' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="sign" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="avgAccuracy" name="All-time %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recentAccuracy" name="Last 24h %" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="detections" name="Detections" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top signs */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Most practiced signs:</p>
          <div className="flex flex-wrap gap-1">
            {accuracyData.slice(0, 8).map(s => (
              <Badge key={s.sign} variant={s.avgAccuracy >= 85 ? 'default' : 'secondary'} className="text-xs">
                {s.sign} {s.avgAccuracy}%
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
