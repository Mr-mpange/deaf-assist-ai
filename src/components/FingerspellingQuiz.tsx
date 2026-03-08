import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Eye, Check, X, RotateCcw, Trophy, Timer, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hand-sign`;
const IMAGE_CACHE_KEY = 'asl-hand-images';

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

function getCachedImages(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setCachedImage(letter: string, dataUrl: string) {
  const cache = getCachedImages();
  cache[letter] = dataUrl;
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface FingerspellingQuizProps {
  className?: string;
}

type QuizState = 'idle' | 'loading' | 'question' | 'result' | 'finished';

interface QuizScore {
  score: number;
  total_questions: number;
  timed: boolean;
  completed_at: string;
}

export function FingerspellingQuiz({ className }: FingerspellingQuizProps) {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizLetters, setQuizLetters] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [images, setImages] = useState<Record<string, string>>(getCachedImages);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [quizSize, setQuizSize] = useState(10);
  const [timedMode, setTimedMode] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [pastScores, setPastScores] = useState<QuizScore[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchingRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const currentLetter = quizLetters[currentIdx];

  // Fetch past scores on mount
  useEffect(() => {
    const fetchScores = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('quiz_scores')
        .select('score, total_questions, timed, completed_at')
        .eq('user_id', user.id)
        .eq('quiz_type', 'fingerspelling')
        .order('completed_at', { ascending: false })
        .limit(10);
      if (data) setPastScores(data);
    };
    fetchScores();
  }, []);

  const fetchImage = useCallback(async (letter: string): Promise<string | null> => {
    if (images[letter]) return images[letter];
    if (fetchingRef.current.has(letter)) return null;
    fetchingRef.current.add(letter);

    try {
      const resp = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ letter }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.image) {
          setImages(prev => ({ ...prev, [letter]: data.image }));
          setCachedImage(letter, data.image);
          return data.image;
        }
      }
    } catch (err) {
      console.error('Failed to fetch image for', letter, err);
    } finally {
      fetchingRef.current.delete(letter);
    }
    return null;
  }, [images]);

  const loadCurrentQuestion = useCallback(async () => {
    if (!currentLetter) return;
    if (images[currentLetter]) {
      setQuizState('question');
      return;
    }
    setIsLoadingImage(true);
    setQuizState('loading');
    await fetchImage(currentLetter);
    const nextLetter = quizLetters[currentIdx + 1];
    if (nextLetter && !images[nextLetter]) {
      fetchImage(nextLetter);
    }
    setIsLoadingImage(false);
    setQuizState('question');
  }, [currentLetter, currentIdx, quizLetters, images, fetchImage]);

  useEffect(() => {
    if (quizState === 'loading' || (quizState === 'question' && !images[currentLetter])) {
      loadCurrentQuestion();
    }
  }, [currentIdx, quizState, loadCurrentQuestion, currentLetter, images]);

  // Timer logic
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (quizState === 'question' && timedMode) {
      setTimeLeft(timePerQuestion);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up — auto-submit wrong
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setAnswerResult('wrong');
            setTotalAnswered(p => p + 1);
            setQuizState('result');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [quizState, currentIdx, timedMode, timePerQuestion]);

  const saveScore = async (finalScore: number, totalQ: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('quiz_scores').insert({
      user_id: user.id,
      score: finalScore,
      total_questions: totalQ,
      quiz_type: 'fingerspelling',
      timed: timedMode,
      time_per_question: timedMode ? timePerQuestion : null,
    });

    if (error) {
      console.error('Failed to save score:', error);
    } else {
      setPastScores(prev => [{
        score: finalScore,
        total_questions: totalQ,
        timed: timedMode,
        completed_at: new Date().toISOString(),
      }, ...prev].slice(0, 10));
      toast({ title: 'Score Saved!', description: `${finalScore}/${totalQ} recorded to your profile` });
    }
  };

  const startQuiz = () => {
    const shuffled = shuffleArray(alphabet).slice(0, quizSize);
    setQuizLetters(shuffled);
    setCurrentIdx(0);
    setScore(0);
    setTotalAnswered(0);
    setUserAnswer('');
    setAnswerResult(null);
    setQuizState('loading');
  };

  const submitAnswer = () => {
    if (!userAnswer.trim() || !currentLetter) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const isCorrect = userAnswer.trim().toLowerCase() === currentLetter;
    setAnswerResult(isCorrect ? 'correct' : 'wrong');
    setTotalAnswered(prev => prev + 1);
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);
    setQuizState('result');
  };

  const nextQuestion = () => {
    setUserAnswer('');
    setAnswerResult(null);
    if (currentIdx + 1 >= quizLetters.length) {
      const finalScore = score;
      setQuizState('finished');
      saveScore(finalScore, quizLetters.length);
    } else {
      setCurrentIdx(prev => prev + 1);
      setQuizState('loading');
    }
  };

  useEffect(() => {
    if (quizState === 'question' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [quizState]);

  const progress = quizLetters.length > 0 ? ((currentIdx + (quizState === 'finished' ? 1 : 0)) / quizLetters.length) * 100 : 0;
  const timerPercent = timedMode && quizState === 'question' ? (timeLeft / timePerQuestion) * 100 : 100;

  return (
    <Card className={cn('border-border/50 shadow-card', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Fingerspelling Quiz
        </CardTitle>
      </CardHeader>
      <CardContent>
        {quizState === 'idle' && (
          <div className="space-y-5">
            <div className="text-center py-4 space-y-2">
              <Eye className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="font-medium text-foreground">Test your ASL alphabet knowledge!</p>
              <p className="text-sm text-muted-foreground">
                See a hand sign image and type the correct letter
              </p>
            </div>

            {/* Settings */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Questions:</span>
                <select
                  value={quizSize}
                  onChange={(e) => setQuizSize(Number(e.target.value))}
                  className="text-sm bg-background rounded-md px-2 py-1 border border-border text-foreground"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={26}>All 26</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Timed Challenge:</span>
                </div>
                <button
                  onClick={() => setTimedMode(!timedMode)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    timedMode ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 rounded-full bg-background transition-transform',
                      timedMode ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {timedMode && (
                <div className="flex items-center justify-between animate-fade-in">
                  <span className="text-sm text-muted-foreground">Seconds per question:</span>
                  <select
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                    className="text-sm bg-background rounded-md px-2 py-1 border border-border text-foreground"
                  >
                    <option value={3}>3s (Hard)</option>
                    <option value={5}>5s (Normal)</option>
                    <option value={8}>8s (Easy)</option>
                    <option value={10}>10s (Relaxed)</option>
                  </select>
                </div>
              )}
            </div>

            <Button onClick={startQuiz} className="w-full">
              {timedMode ? '⚡ Start Timed Challenge' : 'Start Quiz'}
            </Button>

            {/* Past scores */}
            {pastScores.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Recent Scores
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {pastScores.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {s.score}/{s.total_questions}
                        </span>
                        <span className="text-muted-foreground">
                          ({Math.round((s.score / s.total_questions) * 100)}%)
                        </span>
                        {s.timed && (
                          <span className="text-primary flex items-center gap-0.5">
                            <Timer className="w-3 h-3" /> timed
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(s.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {quizState === 'loading' && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Generating hand sign image...</p>
          </div>
        )}

        {(quizState === 'question' || quizState === 'result') && currentLetter && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Question {currentIdx + 1} of {quizLetters.length}</span>
              <span>Score: {score}/{totalAnswered}</span>
            </div>
            <Progress value={progress} className="h-1.5" />

            {/* Timer bar */}
            {timedMode && quizState === 'question' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-primary">
                    <Timer className="w-3 h-3" />
                    <span>{timeLeft}s</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-linear',
                      timerPercent > 50 ? 'bg-primary' : timerPercent > 25 ? 'bg-accent' : 'bg-destructive'
                    )}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Hand image */}
            <div className="flex justify-center">
              <div className="w-44 h-44 rounded-xl overflow-hidden bg-muted/50 border border-border/30 flex items-center justify-center">
                {images[currentLetter] ? (
                  <img
                    src={images[currentLetter]}
                    alt="What letter is this?"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                )}
              </div>
            </div>

            <p className="text-center text-sm font-medium text-foreground">
              What letter is this hand sign?
            </p>

            {/* Answer input */}
            {quizState === 'question' && (
              <div className="flex gap-2 max-w-xs mx-auto">
                <Input
                  ref={inputRef}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value.slice(0, 1))}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder="Type a letter..."
                  className="text-center text-lg uppercase font-bold"
                  maxLength={1}
                />
                <Button onClick={submitAnswer} disabled={!userAnswer.trim()}>
                  Check
                </Button>
              </div>
            )}

            {/* Result feedback */}
            {quizState === 'result' && (
              <div className="text-center space-y-3 animate-fade-in">
                {answerResult === 'correct' ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Check className="w-6 h-6" />
                    <span className="font-bold text-lg">Correct!</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <X className="w-6 h-6" />
                      <span className="font-bold text-lg">
                        {timeLeft === 0 && timedMode ? "Time's up!" : 'Not quite'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The answer was <span className="font-bold text-primary uppercase">{currentLetter}</span>
                    </p>
                  </div>
                )}
                <Button onClick={nextQuestion}>
                  {currentIdx + 1 >= quizLetters.length ? 'See Results' : 'Next Question'}
                </Button>
              </div>
            )}
          </div>
        )}

        {quizState === 'finished' && (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <Trophy className="w-12 h-12 mx-auto text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{score} / {quizLetters.length}</p>
              {timedMode && (
                <p className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
                  <Timer className="w-3 h-3" />
                  Timed challenge ({timePerQuestion}s per question)
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {score === quizLetters.length
                  ? 'Perfect score! You nailed every letter! 🎉'
                  : score >= quizLetters.length * 0.8
                  ? 'Great job! Almost perfect! 💪'
                  : score >= quizLetters.length * 0.5
                  ? 'Good effort! Keep practicing! 📚'
                  : 'Keep studying the alphabet gallery! You got this! 🤟'}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={startQuiz}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setQuizState('idle')}>
                Change Settings
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
