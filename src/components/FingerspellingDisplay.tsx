import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Hand, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hand-sign`;

// ASL fingerspelling descriptions for each letter
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

// LocalStorage cache for generated hand images
const IMAGE_CACHE_KEY = 'asl-hand-images';

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
  } catch {
    // Storage full — clear oldest entries
    const keys = Object.keys(cache);
    if (keys.length > 10) {
      keys.slice(0, 5).forEach(k => delete cache[k]);
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    }
  }
}

interface FingerspellingDisplayProps {
  className?: string;
  initialWord?: string;
}

export function FingerspellingDisplay({ className, initialWord }: FingerspellingDisplayProps) {
  const [word, setWord] = useState(initialWord || '');
  const [activeWord, setActiveWord] = useState('');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500); // slower default for image viewing
  const [handImages, setHandImages] = useState<Record<string, string>>(getCachedImages);
  const [loadingLetter, setLoadingLetter] = useState<string | null>(null);
  const fetchingRef = useRef(new Set<string>());

  const letters = activeWord.toLowerCase().replace(/[^a-z]/g, '').split('');

  // Auto-start if initialWord is provided
  useEffect(() => {
    if (initialWord?.trim()) {
      setWord(initialWord.trim());
      setActiveWord(initialWord.trim());
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [initialWord]);

  // Fetch hand image for a letter
  const fetchHandImage = useCallback(async (letter: string) => {
    if (handImages[letter] || fetchingRef.current.has(letter)) return;
    fetchingRef.current.add(letter);
    setLoadingLetter(letter);

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
          setHandImages(prev => ({ ...prev, [letter]: data.image }));
          setCachedImage(letter, data.image);
        }
      }
    } catch (err) {
      console.error('Failed to fetch hand image for', letter, err);
    } finally {
      fetchingRef.current.delete(letter);
      setLoadingLetter(prev => (prev === letter ? null : prev));
    }
  }, [handImages]);

  // Pre-fetch images for the current letter and next one
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < letters.length) {
      const currentLetter = letters[currentIndex];
      if (currentLetter) fetchHandImage(currentLetter);
      // Pre-fetch next
      const nextLetter = letters[currentIndex + 1];
      if (nextLetter) fetchHandImage(nextLetter);
    }
  }, [currentIndex, letters, fetchHandImage]);

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
  const currentHandImage = currentLetter ? handImages[currentLetter] : null;

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

          {/* Current letter detail with hand image */}
          {letterData && currentIndex < letters.length && (
            <div className="text-center mb-4 animate-fade-in">
              {/* Hand image or loading/fallback */}
              <div className="w-36 h-36 mx-auto mb-3 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center border border-border/30">
                {currentHandImage ? (
                  <img
                    src={currentHandImage}
                    alt={`ASL sign for letter ${currentLetter?.toUpperCase()}`}
                    className="w-full h-full object-cover animate-scale-in"
                  />
                ) : loadingLetter === currentLetter ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Generating...</span>
                  </div>
                ) : (
                  <span className="text-5xl">{letterData.emoji}</span>
                )}
              </div>

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
              <option value={2000}>Slow</option>
              <option value={1500}>Normal</option>
              <option value={900}>Fast</option>
            </select>
          </div>
        </>
      )}
    </Card>
  );
}
