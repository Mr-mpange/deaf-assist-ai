import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Swords, Trophy, Timer, CheckCircle2, XCircle, Zap, Copy,
  Users, Camera, CameraOff, Loader2, Crown, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useHandDetection, classifySign } from '@/hooks/useHandDetection';
import { classifyWithSmoothing, resetClassifier } from '@/lib/signClassifier';
import { useToast } from '@/hooks/use-toast';

const QUIZ_SIGNS = ['A','B','C','D','E','F','G','H','I','K','L','O','R','S','U','V','W','X','Y',
  'ONE','TWO','THREE','FOUR','FIVE','HELLO','THANK YOU','YES','OK','STOP'];

const TIME_PER_SIGN = 12;
const TOTAL_SIGNS = 8;

type GameState = 'lobby' | 'countdown' | 'playing' | 'results';

interface PlayerScore {
  userId: string;
  name: string;
  score: number;
  currentSign: number;
  avgTime: number;
  totalTime: number;
  finished: boolean;
}

export function MultiplayerQuizMode({ className = '' }: { className?: string }) {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [quizSigns, setQuizSigns] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_SIGN);
  const [countdown, setCountdown] = useState(3);
  const [myScore, setMyScore] = useState(0);
  const [matched, setMatched] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myIdRef = useRef(crypto.randomUUID().slice(0, 8));
  const signTimesRef = useRef<number[]>([]);
  const { toast } = useToast();

  const { isLoading: isModelLoading, results: handResults, detectHands, drawLandmarks } = useHandDetection(videoRef);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      setIsCameraOn(true);
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {});
        }
      }, 50);
    } catch {
      toast({ title: 'Camera Error', description: 'Could not access camera.', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  };

  const joinChannel = useCallback((code: string) => {
    const channel = supabase.channel(`quiz-${code}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'player_join' }, ({ payload }) => {
        setPlayers(prev => {
          if (prev.find(p => p.userId === payload.userId)) return prev;
          return [...prev, { userId: payload.userId, name: payload.name, score: 0, currentSign: 0, avgTime: 0, totalTime: 0, finished: false }];
        });
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        setQuizSigns(payload.signs);
        setGameState('countdown');
        setCountdown(3);
      })
      .on('broadcast', { event: 'player_progress' }, ({ payload }) => {
        setPlayers(prev => prev.map(p =>
          p.userId === payload.userId
            ? { ...p, score: payload.score, currentSign: payload.currentSign, avgTime: payload.avgTime, totalTime: payload.totalTime, finished: payload.finished }
            : p
        ));
      })
      .subscribe();

    channelRef.current = channel;
  }, []);

  const createRoom = async () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    joinChannel(code);

    // Announce self
    setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_join',
        payload: { userId: myIdRef.current, name: 'Player 1 (Host)' }
      });
    }, 500);

    await startCamera();
    toast({ title: 'Room Created', description: `Share code: ${code}` });
  };

  const joinRoom = async () => {
    if (joinCode.length < 4) return;
    const code = joinCode.toUpperCase();
    setRoomCode(code);
    setIsHost(false);
    joinChannel(code);

    setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_join',
        payload: { userId: myIdRef.current, name: `Player ${Math.floor(Math.random() * 99) + 2}` }
      });
    }, 500);

    await startCamera();
    toast({ title: 'Joined Room', description: `Room: ${code}` });
  };

  const startGame = () => {
    const shuffled = [...QUIZ_SIGNS].sort(() => Math.random() - 0.5).slice(0, TOTAL_SIGNS);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { signs: shuffled }
    });
  };

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown <= 0) {
      setGameState('playing');
      setCurrentIndex(0);
      setMyScore(0);
      setTimeLeft(TIME_PER_SIGN);
      startTimeRef.current = Date.now();
      signTimesRef.current = [];
      resetClassifier();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, countdown]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing' || matched) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time up, move to next
          signTimesRef.current.push(TIME_PER_SIGN);
          advanceSign(false);
          return TIME_PER_SIGN;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, matched, currentIndex]);

  const advanceSign = (correct: boolean) => {
    const nextIndex = currentIndex + 1;
    const totalTime = signTimesRef.current.reduce((a, b) => a + b, 0);
    const avgTime = signTimesRef.current.length > 0 ? totalTime / signTimesRef.current.length : 0;
    const newScore = correct ? myScore + 1 : myScore;

    if (correct) setMyScore(newScore);

    const finished = nextIndex >= quizSigns.length;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'player_progress',
      payload: {
        userId: myIdRef.current,
        score: newScore,
        currentSign: nextIndex,
        avgTime: Math.round(avgTime * 10) / 10,
        totalTime: Math.round(totalTime * 10) / 10,
        finished,
      }
    });

    if (finished) {
      setGameState('results');
    } else {
      setCurrentIndex(nextIndex);
      setMatched(false);
      setLastDetected(null);
      setTimeLeft(TIME_PER_SIGN);
      startTimeRef.current = Date.now();
      resetClassifier();
    }
  };

  // Detection loop
  useEffect(() => {
    if (gameState !== 'playing' || !isCameraOn || isModelLoading) return;
    const detect = async () => {
      await detectHands();
      animationRef.current = requestAnimationFrame(detect);
    };
    detect();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gameState, isCameraOn, isModelLoading, detectHands]);

  // Process detections
  useEffect(() => {
    if (!handResults?.landmarks || gameState !== 'playing' || matched) return;
    if (canvasRef.current) drawLandmarks(canvasRef.current, handResults.landmarks);

    const smoothed = classifyWithSmoothing(handResults.landmarks, classifySign);
    if (smoothed && smoothed.sign !== 'DETECTING...') {
      setLastDetected(smoothed.sign);
      const target = quizSigns[currentIndex];
      if (smoothed.sign === target || smoothed.sign === target.charAt(0)) {
        const timeUsed = (Date.now() - startTimeRef.current) / 1000;
        signTimesRef.current.push(timeUsed);
        setMatched(true);

        setTimeout(() => advanceSign(true), 800);
      }
    }
  }, [handResults, gameState, matched, currentIndex, quizSigns, drawLandmarks]);

  // Cleanup
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      stopCamera();
    };
  }, []);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Lobby */}
      {gameState === 'lobby' && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Multiplayer Sign Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compete with another student! Both sign the same targets — fastest and most accurate wins.
            </p>

            {!roomCode ? (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={createRoom}>
                  <Zap className="w-5 h-5 mr-2" /> Create Room
                </Button>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter room code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="uppercase"
                    maxLength={6}
                  />
                  <Button onClick={joinRoom} disabled={joinCode.length < 4}>Join</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Room Code:</span>
                  <span className="text-2xl font-mono font-bold tracking-widest text-primary">{roomCode}</span>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(roomCode); toast({ title: 'Copied!' }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" /> Players ({players.length})
                  </p>
                  {players.map(p => (
                    <div key={p.userId} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="text-sm">{p.name}</span>
                      {p.userId === myIdRef.current && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </div>
                  ))}
                  {players.length < 2 && (
                    <p className="text-xs text-muted-foreground animate-pulse">Waiting for opponent...</p>
                  )}
                </div>

                {isHost && players.length >= 2 && (
                  <Button className="w-full" size="lg" onClick={startGame}>
                    <Zap className="w-5 h-5 mr-2" /> Start Match!
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Countdown */}
      {gameState === 'countdown' && (
        <Card className="border-primary">
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">Get ready!</p>
            <p className="text-8xl font-bold text-primary animate-pulse">{countdown}</p>
          </CardContent>
        </Card>
      )}

      {/* Playing */}
      {gameState === 'playing' && (
        <div className="space-y-4">
          {/* Scoreboard */}
          <div className="flex gap-3">
            {sortedPlayers.map((p, i) => (
              <div key={p.userId} className={cn(
                'flex-1 p-2 rounded-lg text-center text-sm',
                p.userId === myIdRef.current ? 'bg-primary/10 border border-primary/30' : 'bg-muted'
              )}>
                <p className="font-bold">{p.name}</p>
                <p className="text-lg font-mono text-primary">{p.score}/{quizSigns.length}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{currentIndex + 1}/{quizSigns.length}</span>
            <Progress value={(currentIndex / quizSigns.length) * 100} className="flex-1" />
          </div>

          {/* Target */}
          <Card className={cn('border-2 transition-colors', matched ? 'border-primary bg-primary/10' : 'border-primary')}>
            <CardContent className="p-6 text-center">
              {matched ? (
                <div className="animate-scale-in">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
                  <p className="text-xl font-bold text-primary mt-1">Match!</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Sign this:</p>
                  <p className="text-5xl font-bold text-primary">{quizSigns[currentIndex]}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Timer className="w-4 h-4" />
                    <span className={cn('text-lg font-mono font-bold', timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-muted-foreground')}>{timeLeft}s</span>
                  </div>
                  {lastDetected && <p className="text-xs text-muted-foreground mt-1">Detected: <span className="font-medium">{lastDetected}</span></p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-foreground/5">
                {isCameraOn ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 w-full h-full pointer-events-none" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CameraOff className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                {isModelLoading && isCameraOn && (
                  <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {gameState === 'results' && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Match Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {sortedPlayers.map((p, i) => (
                <div key={p.userId} className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  i === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/50'
                )}>
                  <div className="flex items-center gap-3">
                    {i === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                    <span className={cn('font-bold', i === 0 && 'text-yellow-500')}>
                      #{i + 1} {p.name}
                    </span>
                    {p.userId === myIdRef.current && <Badge variant="secondary" className="text-xs">You</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono font-bold text-primary">{p.score}/{quizSigns.length}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {p.avgTime}s avg
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => { setGameState('lobby'); setRoomCode(''); setPlayers([]); channelRef.current?.unsubscribe(); }}>
              Play Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
