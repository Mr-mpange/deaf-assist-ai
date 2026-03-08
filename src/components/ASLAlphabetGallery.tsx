import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hand-sign`;
const IMAGE_CACHE_KEY = 'asl-hand-images';

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

const aslDescriptions: Record<string, string> = {
  a: 'Fist with thumb at the side',
  b: 'Flat hand up, thumb across palm',
  c: 'Curved hand, like holding a cup',
  d: 'Index finger up, others touch thumb',
  e: 'Fingers curled down, thumb tucked',
  f: 'Thumb and index circle, others up',
  g: 'Index and thumb point sideways',
  h: 'Index and middle point sideways',
  i: 'Pinky finger up, fist closed',
  j: 'Pinky up, trace J in the air',
  k: 'Index and middle up, thumb between',
  l: 'L shape — index up, thumb out',
  m: 'Three fingers over thumb, fist down',
  n: 'Two fingers over thumb, fist down',
  o: 'All fingers touch thumb, O shape',
  p: 'Like K but pointing down',
  q: 'Like G but pointing down',
  r: 'Index and middle crossed',
  s: 'Fist with thumb over fingers',
  t: 'Thumb between index and middle',
  u: 'Index and middle up together',
  v: 'Index and middle up, spread apart',
  w: 'Index, middle, and ring up spread',
  x: 'Index finger hooked',
  y: 'Thumb and pinky out (hang loose)',
  z: 'Index finger traces Z in air',
};

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
    // storage full
  }
}

interface ASLAlphabetGalleryProps {
  className?: string;
}

export function ASLAlphabetGallery({ className }: ASLAlphabetGalleryProps) {
  const [images, setImages] = useState<Record<string, string>>(getCachedImages);
  const [loadingLetters, setLoadingLetters] = useState<Set<string>>(new Set());
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const fetchingRef = useRef(new Set<string>());

  const fetchImage = useCallback(async (letter: string) => {
    if (images[letter] || fetchingRef.current.has(letter)) return;
    fetchingRef.current.add(letter);
    setLoadingLetters(prev => new Set(prev).add(letter));

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
        }
      }
    } catch (err) {
      console.error('Failed to fetch image for', letter, err);
    } finally {
      fetchingRef.current.delete(letter);
      setLoadingLetters(prev => {
        const next = new Set(prev);
        next.delete(letter);
        return next;
      });
    }
  }, [images]);

  // Load visible letters in batches (6 at a time with delay to avoid rate limits)
  const loadAllImages = useCallback(async () => {
    const batchSize = 3;
    for (let i = 0; i < alphabet.length; i += batchSize) {
      const batch = alphabet.slice(i, i + batchSize);
      await Promise.all(batch.map(l => fetchImage(l)));
      if (i + batchSize < alphabet.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }, [fetchImage]);

  // Load image on click if not cached
  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
    if (!images[letter]) {
      fetchImage(letter);
    }
  };

  return (
    <Card className={cn('border-border/50 shadow-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            ASL Alphabet Gallery
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllImages}
            disabled={loadingLetters.size > 0}
          >
            {loadingLetters.size > 0 ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Loading ({loadingLetters.size})...
              </>
            ) : (
              'Load All Images'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Selected letter detail view */}
        {selectedLetter && (
          <div className="mb-4 p-4 bg-muted/50 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-background border border-border/30 flex items-center justify-center shrink-0">
              {images[selectedLetter] ? (
                <img
                  src={images[selectedLetter]}
                  alt={`ASL letter ${selectedLetter.toUpperCase()}`}
                  className="w-full h-full object-cover"
                />
              ) : loadingLetters.has(selectedLetter) ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground uppercase">{selectedLetter}</span>
              )}
            </div>
            <div className="text-center sm:text-left">
              <p className="text-4xl font-bold text-primary uppercase mb-1">{selectedLetter}</p>
              <p className="text-sm text-muted-foreground">{aslDescriptions[selectedLetter]}</p>
              {!images[selectedLetter] && !loadingLetters.has(selectedLetter) && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => fetchImage(selectedLetter)}>
                  Generate hand image
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Letter grid */}
        <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterClick(letter)}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center overflow-hidden border transition-all duration-200 hover:scale-105 cursor-pointer',
                selectedLetter === letter
                  ? 'border-primary ring-2 ring-primary/30 scale-105'
                  : 'border-border/30 hover:border-primary/50',
                images[letter] ? 'bg-background' : 'bg-muted'
              )}
            >
              {images[letter] ? (
                <img
                  src={images[letter]}
                  alt={`ASL ${letter.toUpperCase()}`}
                  className="w-full h-full object-cover"
                />
              ) : loadingLetters.has(letter) ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              ) : (
                <span className="text-sm font-bold uppercase text-muted-foreground">{letter}</span>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
