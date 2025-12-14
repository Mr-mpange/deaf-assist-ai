import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hand, Play, Volume2 } from 'lucide-react';
import { findSignsInText, SignDefinition } from '@/data/signLanguageDictionary';

interface SignDisplayProps {
  text: string;
  className?: string;
}

export function SignDisplay({ text, className = "" }: SignDisplayProps) {
  const [signs, setSigns] = useState<SignDefinition[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (text) {
      const foundSigns = findSignsInText(text);
      setSigns(foundSigns);
      setCurrentIndex(0);
    }
  }, [text]);

  const getEmoji = (word: string): string => {
    const emojiMap: Record<string, string> = {
      'hello': '👋', 'hi': '👋', 'goodbye': '👋', 'bye': '👋',
      'please': '🙏', 'thank': '🙏', 'you': '👉', 'me': '👈',
      'what': '🤷', 'where': '🤔', 'when': '⏰', 'how': '❓',
      'one': '☝️', 'two': '✌️', 'three': '🤟', 'four': '🖐️', 'five': '🖐️',
      'good': '👍', 'bad': '👎', 'yes': '👍', 'no': '👎'
    };
    return emojiMap[word.toLowerCase()] || '✋';
  };

  const speakText = () => {
    if (!text.trim()) {
      console.log('🔇 No text to speak');
      return;
    }

    console.log('🔊 [SignDisplay] SPEAKING:', text);

    if ('speechSynthesis' in window) {
      try {
        // Stop any current speech
        speechSynthesis.cancel();
        
        // Simple, direct approach
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.8;
          utterance.volume = 1.0;
          
          utterance.onstart = () => console.log('🎤 [SignDisplay] SPEECH STARTED:', text);
          utterance.onend = () => console.log('✅ [SignDisplay] SPEECH ENDED:', text);
          utterance.onerror = (e) => console.error('❌ [SignDisplay] SPEECH ERROR:', e.error);
          
          console.log('🚀 [SignDisplay] CALLING speechSynthesis.speak()');
          speechSynthesis.speak(utterance);
          
        }, 200);

      } catch (error) {
        console.error('💥 [SignDisplay] Speech failed:', error);
      }
    } else {
      console.error('❌ [SignDisplay] Speech synthesis not supported');
    }
  };

  if (!signs.length) {
    return (
      <Card className={`border-border/50 shadow-card ${className}`}>
        <CardContent className="py-8 text-center">
          <Hand className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No signs found</p>
        </CardContent>
      </Card>
    );
  }

  const currentSign = signs[currentIndex];

  return (
    <Card className={`border-border/50 shadow-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            Sign Language
          </div>
          <Button variant="ghost" size="sm" onClick={speakText}>
            <Volume2 className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">{getEmoji(currentSign.word)}</div>
          <h3 className="text-xl font-bold text-primary mb-1">
            {currentSign.word.toUpperCase()}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {currentSign.description}
          </p>
          <Badge variant="secondary">{currentSign.category}</Badge>
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Hand Shape: </span>
            {currentSign.handShape}
          </div>
          <div className="text-sm">
            <span className="font-medium">Movement: </span>
            {currentSign.movement}
          </div>
        </div>

        {signs.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {currentIndex + 1} of {signs.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.min(signs.length - 1, currentIndex + 1))}
                  disabled={currentIndex === signs.length - 1}
                >
                  →
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {signs.map((sign, index) => (
                <Button
                  key={index}
                  variant={index === currentIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentIndex(index)}
                >
                  {sign.word}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}