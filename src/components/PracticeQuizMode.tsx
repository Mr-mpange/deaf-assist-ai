import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Timer,
  CheckCircle2,
  XCircle,
  SkipForward,
  Trophy,
  RotateCcw,
  Zap,
  Camera,
  CameraOff,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHandDetection, classifySign } from '@/hooks/useHandDetection';
import { classifyWithSmoothing, resetClassifier } from '@/lib/signClassifier';
import { useToast } from '@/hooks/use-toast';
import { recordResult, getReviewQueue } from '@/lib/spacedRepetition';

const QUIZ_SIGNS = {
  alphabet: ['A','B','C','D','E','F','G','H','I','K','L','O','R','S','U','V','W','X','Y'],
  numbers: ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ZERO'],
  phrases: ['HELLO','THANK YOU','YES','SORRY','HELP','OK','STOP'],
};

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { timeLimit: number; signCount: number; categories: (keyof typeof QUIZ_SIGNS)[] }> = {
  easy: { timeLimit: 15, signCount: 5, categories: ['alphabet'] },
  medium: { timeLimit: 10, signCount: 8, categories: ['alphabet', 'numbers'] },
  hard: { timeLimit: 7, signCount: 12, categories: ['alphabet', 'numbers', 'phrases'] },
};

interface QuizResult {
  sign: string;
  correct: boolean;
  timeUsed: number;
  confidence: number;
}

export function PracticeQuizMode({ className = '' }: { className?: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [quizActive, setQuizActive] = useState(false);
  const [quizSigns, setQuizSigns] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [matched, setMatched] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const { toast } = useToast();

  const { isLoading: isModelLoading, results: handResults, detectHands, drawLandmarks } = useHandDetection(videoRef);

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

  const [useSRS, setUseSRS] = useState(true);

  const generateQuiz = useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const pool: string[] = [];
    config.categories.forEach(cat => pool.push(...QUIZ_SIGNS[cat]));

    if (useSRS) {
      // Use spaced repetition to prioritize struggling signs
      return getReviewQueue(pool, config.signCount);
    }

    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, config.signCount);
  }, [difficulty, useSRS]);

  const startQuiz = async () => {
    if (!isCameraOn) await startCamera();
    resetClassifier();
    const signs = generateQuiz();
    setQuizSigns(signs);
    setCurrentIndex(0);
    setResults([]);
    setQuizComplete(false);
    setMatched(false);
    setLastDetected(null);
    setTimeLeft(DIFFICULTY_CONFIG[difficulty].timeLimit);
    startTimeRef.current = Date.now();
    setQuizActive(true);
  };

  // Timer countdown
  useEffect(() => {
    if (!quizActive || quizComplete || matched) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up for this sign
          recordResult(quizSigns[currentIndex], false, DIFFICULTY_CONFIG[difficulty].timeLimit * 1000);
          setResults(r => [...r, { sign: quizSigns[currentIndex], correct: false, timeUsed: DIFFICULTY_CONFIG[difficulty].timeLimit, confidence: 0 }]);
          if (currentIndex + 1 >= quizSigns.length) {
            setQuizComplete(true);
            setQuizActive(false);
          } else {
            setCurrentIndex(i => i + 1);
            resetClassifier();
            setMatched(false);
            setLastDetected(null);
            startTimeRef.current = Date.now();
          }
          return DIFFICULTY_CONFIG[difficulty].timeLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quizActive, quizComplete, matched, currentIndex, quizSigns, difficulty]);

  // Detection loop
  useEffect(() => {
    if (!quizActive || !isCameraOn || isModelLoading) return;
    const detect = async () => {
      await detectHands();
      animationRef.current = requestAnimationFrame(detect);
    };
    detect();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [quizActive, isCameraOn, isModelLoading, detectHands]);

  // Process hand results
  useEffect(() => {
    if (!handResults?.landmarks || !quizActive || matched || quizComplete) return;
    if (canvasRef.current) drawLandmarks(canvasRef.current, handResults.landmarks);

    const smoothed = classifyWithSmoothing(handResults.landmarks, classifySign);
    if (smoothed && smoothed.sign !== 'DETECTING...') {
      setLastDetected(smoothed.sign);
      const target = quizSigns[currentIndex];
      if (smoothed.sign === target || smoothed.sign === target.charAt(0)) {
        const timeUsed = (Date.now() - startTimeRef.current) / 1000;
        setMatched(true);
        recordResult(target, true, timeUsed * 1000);
        setResults(r => [...r, { sign: target, correct: true, timeUsed, confidence: smoothed.confidence }]);

        // Auto-advance after brief celebration
        setTimeout(() => {
          if (currentIndex + 1 >= quizSigns.length) {
            setQuizComplete(true);
            setQuizActive(false);
          } else {
            setCurrentIndex(i => i + 1);
            resetClassifier();
            setMatched(false);
            setLastDetected(null);
            setTimeLeft(DIFFICULTY_CONFIG[difficulty].timeLimit);
            startTimeRef.current = Date.now();
          }
        }, 1200);
      }
    }
  }, [handResults, quizActive, matched, quizComplete, quizSigns, currentIndex, difficulty, drawLandmarks]);

  const skipSign = () => {
    const timeUsed = (Date.now() - startTimeRef.current) / 1000;
    recordResult(quizSigns[currentIndex], false, timeUsed * 1000);
    setResults(r => [...r, { sign: quizSigns[currentIndex], correct: false, timeUsed, confidence: 0 }]);
    if (currentIndex + 1 >= quizSigns.length) {
      setQuizComplete(true);
      setQuizActive(false);
    } else {
      setCurrentIndex(i => i + 1);
      resetClassifier();
      setMatched(false);
      setLastDetected(null);
      setTimeLeft(DIFFICULTY_CONFIG[difficulty].timeLimit);
      startTimeRef.current = Date.now();
    }
  };

  const score = results.filter(r => r.correct).length;
  const totalQuestions = quizSigns.length || 1;
  const accuracy = Math.round((score / totalQuestions) * 100);
  const avgTime = results.length ? (results.reduce((a, r) => a + r.timeUsed, 0) / results.length).toFixed(1) : '0';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quiz Setup */}
      {!quizActive && !quizComplete && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Sign Quiz Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The AI will show you a target sign — perform it correctly before time runs out!
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <Button key={d} variant={difficulty === d ? 'default' : 'outline'} size="sm" onClick={() => setDifficulty(d)}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Button>
                ))}
              </div>
              <Button variant={useSRS ? 'default' : 'outline'} size="sm" onClick={() => setUseSRS(!useSRS)} title="Smart Review prioritizes signs you struggle with">
                🧠 Smart Review {useSRS ? 'ON' : 'OFF'}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>⏱ Time per sign: {DIFFICULTY_CONFIG[difficulty].timeLimit}s</p>
              <p>📋 Signs: {DIFFICULTY_CONFIG[difficulty].signCount}</p>
              <p>📚 Categories: {DIFFICULTY_CONFIG[difficulty].categories.join(', ')}</p>
            </div>
            <Button className="w-full" size="lg" onClick={startQuiz}>
              <Zap className="w-5 h-5 mr-2" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Quiz */}
      {quizActive && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{currentIndex + 1}/{quizSigns.length}</span>
            <Progress value={((currentIndex) / quizSigns.length) * 100} className="flex-1" />
            <Badge variant="secondary">{score} ✓</Badge>
          </div>

          {/* Target sign */}
          <Card className={cn(
            'border-2 transition-colors',
            matched ? 'border-primary bg-primary/10' : 'border-primary'
          )}>
            <CardContent className="p-6 text-center">
              {matched ? (
                <div className="space-y-2 animate-scale-in">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
                  <p className="text-2xl font-bold text-primary">Correct!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Show this sign:</p>
                  <p className="text-5xl font-bold text-primary">{quizSigns[currentIndex]}</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className={cn(
                      'text-lg font-mono font-bold',
                      timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-muted-foreground'
                    )}>
                      {timeLeft}s
                    </span>
                  </div>
                  {lastDetected && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Detecting: <span className="font-medium text-foreground">{lastDetected}</span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera feed */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-foreground/5">
                {isCameraOn ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 w-full h-full pointer-events-none" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <CameraOff className="w-12 h-12 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">Camera off</p>
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

          {/* Controls */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={skipSign}>
              <SkipForward className="w-4 h-4 mr-2" /> Skip
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => { setQuizActive(false); setQuizComplete(true); }}>
              End Quiz
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {quizComplete && (
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Quiz Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{score}/{results.length}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{avgTime}s</p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
            </div>

            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div className="flex items-center gap-2">
                    {r.correct
                      ? <CheckCircle2 className="w-4 h-4 text-primary" />
                      : <XCircle className="w-4 h-4 text-destructive" />
                    }
                    <span className="font-medium text-sm">{r.sign}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.correct && <Badge variant="secondary" className="text-xs">{Math.round(r.confidence * 100)}%</Badge>}
                    <span className="text-xs text-muted-foreground">{r.timeUsed.toFixed(1)}s</span>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => { setQuizComplete(false); startQuiz(); }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
