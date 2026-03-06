import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

// ASL fingerspelling hand descriptions for each letter
const aslAlphabet: Record<string, { description: string; emoji: string }> = {
  a: { description: 'Fist with thumb at the side', emoji: '✊' },
  b: { description: 'Flat hand up, thumb across palm', emoji: '🖐' },
  c: { description: 'Curved hand, like holding a cup', emoji: '🤏' },
  d: { description: 'Index finger up, others touch thumb', emoji: '☝️' },
  e: { description: 'Fingers curled down, thumb tucked', emoji: '✊' },
  f: { description: 'Thumb and index circle, others up', emoji: '👌' },
  g: { description: 'Index and thumb point sideways', emoji: '👉' },
  h: { description: 'Index and middle point sideways', emoji: '👉' },
  i: { description: 'Pinky finger up, fist closed', emoji: '🤙' },
  j: { description: 'Pinky up, trace J in the air', emoji: '🤙' },
  k: { description: 'Index and middle up, thumb between', emoji: '✌️' },
  l: { description: 'L shape — index up, thumb out', emoji: '🤟' },
  m: { description: 'Three fingers over thumb, fist down', emoji: '✊' },
  n: { description: 'Two fingers over thumb, fist down', emoji: '✊' },
  o: { description: 'All fingers touch thumb, O shape', emoji: '👌' },
  p: { description: 'Like K but pointing down', emoji: '👇' },
  q: { description: 'Like G but pointing down', emoji: '👇' },
  r: { description: 'Index and middle crossed', emoji: '🤞' },
  s: { description: 'Fist with thumb over fingers', emoji: '✊' },
  t: { description: 'Thumb between index and middle', emoji: '✊' },
  u: { description: 'Index and middle up together', emoji: '✌️' },
  v: { description: 'Index and middle up, spread apart', emoji: '✌️' },
  w: { description: 'Index, middle, and ring up spread', emoji: '🤟' },
  x: { description: 'Index finger hooked', emoji: '☝️' },
  y: { description: 'Thumb and pinky out (hang loose)', emoji: '🤙' },
  z: { description: 'Index finger traces Z in air', emoji: '☝️' },
};

interface FingerspellingDisplayProps {
  className?: string;
}

export function FingerspellingDisplay({ className }: FingerspellingDisplayProps) {
  const [word, setWord] = useState('');
  const [activeWord, setActiveWord] = useState('');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms per letter

  const letters = activeWord.toLowerCase().replace(/[^a-z]/g, '').split('');

  const startSpelling = useCallback(() => {
    if (!word.trim()) return;
    setActiveWord(word.trim());
    setCurrentIndex(0);
    setIsPlaying(true);
  }, [word]);

  const reset = useCallback(() => {
    setCurrentIndex(-1);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!activeWord) {
      startSpelling();
      return;
    }
    if (currentIndex >= letters.length) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(prev => !prev);
  }, [activeWord, currentIndex, letters.length, startSpelling]);

  useEffect(() => {
    if (!isPlaying || currentIndex < 0) return;
    if (currentIndex >= letters.length) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, letters.length, speed]);

  const currentLetter = letters[currentIndex];
  const letterData = currentLetter ? aslAlphabet[currentLetter] : null;

  return (
    <Card className={cn('border-border/50 shadow-card p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Hand className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Fingerspelling</span>
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startSpelling()}
          placeholder="Type a word to spell..."
          className="text-sm"
        />
        <Button size="sm" onClick={startSpelling} disabled={!word.trim()}>
          Go
        </Button>
      </div>

      {/* Display */}
      {activeWord && (
        <>
          {/* Letter track */}
          <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
            {letters.map((letter, i) => (
              <div
                key={i}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold uppercase transition-all duration-300',
                  i === currentIndex
                    ? 'bg-primary text-primary-foreground scale-125 shadow-glow'
                    : i < currentIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Current letter detail */}
          {letterData && currentIndex < letters.length && (
            <div className="text-center mb-4 animate-fade-in">
              <div className="text-5xl mb-2">{letterData.emoji}</div>
              <p className="text-3xl font-bold uppercase text-primary mb-1">
                {currentLetter}
              </p>
              <p className="text-sm text-muted-foreground">
                {letterData.description}
              </p>
            </div>
          )}

          {currentIndex >= letters.length && letters.length > 0 && (
            <div className="text-center mb-4 py-3">
              <p className="text-lg font-medium text-primary">
                "{activeWord}" complete! 🎉
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try spelling it yourself now!
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="text-xs bg-muted rounded-md px-2 py-1.5 border border-border text-foreground"
            >
              <option value={1500}>Slow</option>
              <option value={1000}>Normal</option>
              <option value={600}>Fast</option>
            </select>
          </div>
        </>
      )}
    </Card>
  );
}
