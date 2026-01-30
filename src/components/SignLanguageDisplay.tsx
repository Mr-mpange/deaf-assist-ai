import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Hand, 
  Play, 
  Pause, 
  RotateCcw,
  Volume2
} from 'lucide-react';
import { SignDefinition, findSignsInText } from '@/data/signLanguageDictionary';

interface SignLanguageDisplayProps {
  text: string;
  autoPlay?: boolean;
  className?: string;
}

// Helper function to get appropriate emoji for sign
function getHandEmoji(word: string): string {
  const emojiMap: Record<string, string> = {
    'hello': '👋',
    'hi': '👋',
    'goodbye': '👋',
    'bye': '👋',
    'please': '🙏',
    'thank': '🙏',
    'thanks': '🙏',
    'you': '👉',
    'me': '👈',
    'what': '🤷',
    'where': '🤔',
    'when': '⏰',
    'how': '❓',
    'one': '☝️',
    'two': '✌️',
    'three': '🤟',
    'four': '🖐️',
    'five': '🖐️',
    'a': '🖐️',
    'b': '✊',
    'c': '🤏',
    'good': '👍',
    'bad': '👎',
    'yes': '👍',
    'no': '👎',
  };
  return emojiMap[word.toLowerCase()] || '✋';
}

export function SignLanguageDisplay({ 
  text, 
  autoPlay = true,
  className = "" 
}: SignLanguageDisplayProps) {
  const [signs, setSigns] = useState<SignDefinition[]>([]);
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Extract signs from text
  useEffect(() => {
    if (text) {
      const foundSigns = findSignsInText(text);
      setSigns(foundSigns);
      setCurrentSignIndex(0);
      setCurrentStep(0);
      
      if (autoPlay && foundSigns.length > 0) {
        setIsPlaying(true);
      }
    }
  }, [text, autoPlay]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || signs.length === 0) return;

    const currentSign = signs[currentSignIndex];
    if (!currentSign) return;

    const timer = setTimeout(() => {
      if (currentStep < currentSign.animationSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Move to next sign
        if (currentSignIndex < signs.length - 1) {
          setCurrentSignIndex(prev => prev + 1);
          setCurrentStep(0);
        } else {
          // Animation complete
          setIsPlaying(false);
          setCurrentSignIndex(0);
          setCurrentStep(0);
        }
      }
    }, 2000); // 2 seconds per step

    return () => clearTimeout(timer);
  }, [isPlaying, currentSignIndex, currentStep, signs]);

  const currentSign = signs[currentSignIndex];

  const playAnimation = () => {
    setIsPlaying(true);
    setCurrentSignIndex(0);
    setCurrentStep(0);
  };

  const pauseAnimation = () => {
    setIsPlaying(false);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentSignIndex(0);
    setCurrentStep(0);
  };

  const nextSign = () => {
    if (currentSignIndex < signs.length - 1) {
      setCurrentSignIndex(prev => prev + 1);
      setCurrentStep(0);
    }
  };

  const previousSign = () => {
    if (currentSignIndex > 0) {
      setCurrentSignIndex(prev => prev - 1);
      setCurrentStep(0);
    }
  };

  const speakText = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  if (!text || signs.length === 0) {
    return (
      <Card className={`border-border/50 shadow-card ${className}`}>
        <CardContent className="py-12 text-center">
          <Hand className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No sign language found for this message
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try words like: hello, thank you, please, good, yes, no
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border/50 shadow-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Hand className="w-5 h-5 text-primary" />
          Sign Language Display
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing signs for: "{text}"
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={speakText}
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Sign {currentSignIndex + 1} of {signs.length}
            </Badge>
            {currentSign && (
              <Badge variant="secondary">
                {currentSign.category}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {signs.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentSignIndex 
                    ? 'bg-primary' 
                    : index < currentSignIndex 
                      ? 'bg-primary/50' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Sign Display */}
        {currentSign && (
          <div className="space-y-4">
            {/* Sign Word */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-primary mb-2">
                {currentSign.word.toUpperCase()}
              </h3>
              <p className="text-muted-foreground">
                {currentSign.description}
              </p>
            </div>

            {/* Animation Area */}
            <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                {/* Hand Shape Illustration */}
                <div className="text-6xl mb-4">
                  {getHandEmoji(currentSign.word)}
                </div>
                
                {/* Current Animation Step */}
                <div className="text-center space-y-2">
                  <Badge variant="default" className="mb-2">
                    Step {currentStep + 1} of {currentSign.animationSteps.length}
                  </Badge>
                  <p className="text-lg font-medium">
                    {currentSign.animationSteps[currentStep]}
                  </p>
                </div>

                {/* Animation Progress */}
                <div className="w-full max-w-xs mt-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${((currentStep + 1) / currentSign.animationSteps.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={playAnimation}
                    className="bg-white/90 hover:bg-white"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                </div>
              )}
            </div>

            {/* Sign Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Hand Shape</p>
                <p>{currentSign.handShape}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Movement</p>
                <p>{currentSign.movement}</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Position</p>
                <p>{currentSign.position}</p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousSign}
            disabled={currentSignIndex === 0}
          >
            ← Previous
          </Button>
          
          <Button
            variant={isPlaying ? "destructive" : "default"}
            size="sm"
            onClick={isPlaying ? pauseAnimation : playAnimation}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetAnimation}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextSign}
            disabled={currentSignIndex === signs.length - 1}
          >
            Next →
          </Button>
        </div>

        {/* All Signs Preview */}
        {signs.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">All Signs in Message:</p>
            <div className="flex flex-wrap gap-2">
              {signs.map((sign, index) => (
                <Button
                  key={index}
                  variant={index === currentSignIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCurrentSignIndex(index);
                    setCurrentStep(0);
                    setIsPlaying(false);
                  }}
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
