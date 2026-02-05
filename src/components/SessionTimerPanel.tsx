import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Timer, Play, Pause, RotateCcw, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface TimerState {
  duration: number; // in seconds
  remaining: number;
  isRunning: boolean;
  label: string;
}

interface SessionTimerPanelProps {
  sessionId: string;
  isHost: boolean;
}

export function SessionTimerPanel({ sessionId, isHost }: SessionTimerPanelProps) {
  const { toast } = useToast();
  const { playCalledSound } = useNotificationSound();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [minutes, setMinutes] = useState(2);
  const [timerLabel, setTimerLabel] = useState('Practice Time');

  // Subscribe to timer updates
  useEffect(() => {
    const channel = supabase
      .channel(`timer-${sessionId}`)
      .on('broadcast', { event: 'timer_update' }, (payload) => {
        setTimer(payload.payload as TimerState);
      })
      .on('broadcast', { event: 'timer_tick' }, (payload) => {
        setTimer(prev => prev ? { ...prev, remaining: payload.payload.remaining } : null);
      })
      .on('broadcast', { event: 'timer_ended' }, () => {
        setTimer(null);
        playCalledSound();
        toast({
          title: "⏰ Time's Up!",
          description: "The practice timer has ended",
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, playCalledSound, toast]);

  // Local countdown for smooth display
  useEffect(() => {
    if (!timer?.isRunning) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (!prev || prev.remaining <= 0) return prev;
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer?.isRunning]);

  // Check for timer end locally
  useEffect(() => {
    if (timer && timer.remaining <= 0 && timer.isRunning && isHost) {
      endTimer();
    }
  }, [timer?.remaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = async () => {
    const durationSeconds = minutes * 60;
    const newTimer: TimerState = {
      duration: durationSeconds,
      remaining: durationSeconds,
      isRunning: true,
      label: timerLabel,
    };

    await supabase
      .channel(`timer-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'timer_update',
        payload: newTimer,
      });

    setTimer(newTimer);
    
    toast({
      title: "Timer Started",
      description: `${minutes} minute${minutes > 1 ? 's' : ''} - ${timerLabel}`,
    });
  };

  const pauseTimer = async () => {
    if (!timer) return;

    const updatedTimer = { ...timer, isRunning: false };
    
    await supabase
      .channel(`timer-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'timer_update',
        payload: updatedTimer,
      });

    setTimer(updatedTimer);
  };

  const resumeTimer = async () => {
    if (!timer) return;

    const updatedTimer = { ...timer, isRunning: true };
    
    await supabase
      .channel(`timer-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'timer_update',
        payload: updatedTimer,
      });

    setTimer(updatedTimer);
  };

  const resetTimer = async () => {
    if (!timer) return;

    const updatedTimer = { ...timer, remaining: timer.duration, isRunning: false };
    
    await supabase
      .channel(`timer-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'timer_update',
        payload: updatedTimer,
      });

    setTimer(updatedTimer);
  };

  const endTimer = async () => {
    await supabase
      .channel(`timer-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'timer_ended',
        payload: {},
      });

    setTimer(null);
  };

  const getProgress = () => {
    if (!timer) return 0;
    return ((timer.duration - timer.remaining) / timer.duration) * 100;
  };

  // Quick preset buttons
  const presets = [
    { label: '30s', seconds: 30 },
    { label: '1m', seconds: 60 },
    { label: '2m', seconds: 120 },
    { label: '5m', seconds: 300 },
  ];

  // Host view with controls
  if (isHost) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Practice Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {timer ? (
            <>
              {/* Active Timer Display */}
              <div className="text-center space-y-2">
                <Badge variant={timer.isRunning ? "default" : "secondary"}>
                  {timer.label}
                </Badge>
                <div className={`text-5xl font-mono font-bold ${timer.remaining <= 10 ? 'text-destructive animate-pulse' : ''}`}>
                  {formatTime(timer.remaining)}
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex justify-center gap-2">
                {timer.isRunning ? (
                  <Button onClick={pauseTimer} variant="outline" size="lg">
                    <Pause className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button onClick={resumeTimer} variant="gradient" size="lg">
                    <Play className="w-5 h-5" />
                  </Button>
                )}
                <Button onClick={resetTimer} variant="outline" size="lg">
                  <RotateCcw className="w-5 h-5" />
                </Button>
                <Button onClick={endTimer} variant="destructive" size="lg">
                  End
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Timer Setup */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Timer Label</Label>
                  <Input
                    value={timerLabel}
                    onChange={(e) => setTimerLabel(e.target.value)}
                    placeholder="Practice Time"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setMinutes(preset.seconds / 60)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={startTimer} className="w-full" variant="gradient">
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Student view - only shows when timer is active
  if (timer) {
    return (
      <Card className={`border-border/50 shadow-card ${timer.remaining <= 10 ? 'border-destructive bg-destructive/5' : ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${timer.remaining <= 10 ? 'text-destructive' : 'text-primary'}`} />
              {timer.label}
            </span>
            {timer.remaining <= 10 && <Bell className="w-5 h-5 text-destructive animate-bounce" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-center">
            <div className={`text-5xl font-mono font-bold ${timer.remaining <= 10 ? 'text-destructive animate-pulse' : ''}`}>
              {formatTime(timer.remaining)}
            </div>
            {!timer.isRunning && (
              <Badge variant="secondary" className="mt-2">Paused</Badge>
            )}
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${timer.remaining <= 10 ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
