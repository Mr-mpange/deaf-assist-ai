import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Captions, 
  CaptionsOff, 
  Hand, 
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { signLanguageDictionary, type SignDefinition } from '@/data/signLanguageDictionary';
import { cn } from '@/lib/utils';

interface CaptionEntry {
  id: string;
  text: string;
  timestamp: Date;
  matchedSigns: SignDefinition[];
  isFinal: boolean;
}

interface LiveCaptionsPanelProps {
  isHost: boolean;
  /** Pass the host's MediaStream so we can capture audio for captions */
  hostStream?: MediaStream | null;
  /** Callback when a sign-matched word is detected in speech */
  onSignDetected?: (words: string[]) => void;
}

export function LiveCaptionsPanel({ isHost, hostStream, onSignDetected }: LiveCaptionsPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [captions, setCaptions] = useState<CaptionEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentMatchedSigns, setCurrentMatchedSigns] = useState<SignDefinition[]>([]);
  const [expandedSignId, setExpandedSignId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const captionIdRef = useRef(0);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Match words against sign dictionary
  const matchWordsToSigns = useCallback((text: string): SignDefinition[] => {
    const words = text.toLowerCase().replace(/[^\\w\\s]/g, '').split(/\\s+/);
    const matched: SignDefinition[] = [];
    const seen = new Set<string>();

    // Check multi-word phrases first
    const lowerText = text.toLowerCase();
    for (const [key, sign] of Object.entries(signLanguageDictionary)) {
      if (key.includes(' ') && lowerText.includes(key) && !seen.has(key)) {
        matched.push(sign);
        seen.add(key);
      }
    }

    // Then check individual words
    for (const word of words) {
      if (word.length < 2) continue;
      const sign = signLanguageDictionary[word];
      if (sign && !seen.has(word)) {
        matched.push(sign);
        seen.add(word);
      }
    }

    return matched;
  }, []);

  // Start/stop speech recognition
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        const matchedSigns = matchWordsToSigns(final);
        captionIdRef.current++;
        setCaptions(prev => [
          ...prev.slice(-50), // Keep last 50 captions
          {
            id: `caption-${captionIdRef.current}`,
            text: final.trim(),
            timestamp: new Date(),
            matchedSigns,
            isFinal: true,
          }
        ]);
        setCurrentTranscript('');
        setCurrentMatchedSigns([]);

        // Notify parent about matched sign words for avatar animation
        if (matchedSigns.length > 0 && onSignDetected) {
          onSignDetected(matchedSigns.map(s => s.word));
        }
      }

      if (interim) {
        setCurrentTranscript(interim);
        setCurrentMatchedSigns(matchWordsToSigns(interim));
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
      // Auto-restart on non-fatal errors
      if (['network', 'aborted', 'no-speech'].includes(event.error)) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch { /* ignore */ }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListening) {
        try {
          recognition.start();
        } catch { /* ignore */ }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  }, [isListening, matchWordsToSigns]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions, currentTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Keep recognition running when isListening changes
  useEffect(() => {
    if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CaptionsOff className="w-5 h-5 text-muted-foreground" />
            Live Captions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Live captions are not supported in this browser. Please use Chrome or Edge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Captions className="w-5 h-5 text-primary" />
            Live Captions
            {isListening && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                LIVE
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-3">
          {/* Controls */}
          <div className="flex gap-2">
            <Button
              variant={isListening ? 'destructive' : 'default'}
              size="sm"
              onClick={toggleListening}
              className="flex-1"
            >
              {isListening ? (
                <>
                  <VolumeX className="w-4 h-4 mr-1" />
                  Stop Captions
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-1" />
                  Start Captions
                </>
              )}
            </Button>
          </div>

          {/* Captions display */}
          <ScrollArea className="h-48 rounded-md border border-border/50 bg-muted/30 p-3" ref={scrollRef as any}>
            <div className="space-y-3">
              {captions.length === 0 && !currentTranscript && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isListening 
                    ? 'Listening for speech...' 
                    : 'Click "Start Captions" to begin live transcription'}
                </p>
              )}

              {captions.map((caption) => (
                <div key={caption.id} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground mt-1 shrink-0">
                      {caption.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {caption.text.split(/\\s+/).map((word, i) => {
                        const isMatched = signLanguageDictionary[word.toLowerCase().replace(/[^\\w]/g, '')];
                        return (
                          <span key={i}>
                            {i > 0 && ' '}
                            <span className={cn(
                              isMatched && 'text-primary font-semibold underline decoration-primary/30 cursor-pointer'
                            )}
                              onClick={() => {
                                if (isMatched) {
                                  setExpandedSignId(
                                    expandedSignId === `${caption.id}-${word}` 
                                      ? null 
                                      : `${caption.id}-${word}`
                                  );
                                }
                              }}
                            >
                              {word}
                            </span>
                          </span>
                        );
                      })}
                    </p>
                  </div>

                  {/* Matched signs display */}
                  {caption.matchedSigns.length > 0 && (
                    <div className="ml-12 flex flex-wrap gap-1.5">
                      {caption.matchedSigns.map((sign, i) => (
                        <SignBadge 
                          key={`${caption.id}-sign-${i}`} 
                          sign={sign}
                          isExpanded={expandedSignId === `${caption.id}-${sign.word}`}
                          onToggle={() => setExpandedSignId(
                            expandedSignId === `${caption.id}-${sign.word}` 
                              ? null 
                              : `${caption.id}-${sign.word}`
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Current (interim) transcript */}
              {currentTranscript && (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground mt-1 shrink-0">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      {currentTranscript}
                      <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
                    </p>
                  </div>
                  {currentMatchedSigns.length > 0 && (
                    <div className="ml-12 flex flex-wrap gap-1.5">
                      {currentMatchedSigns.map((sign, i) => (
                        <SignBadge key={`interim-${i}`} sign={sign} isExpanded={false} onToggle={() => {}} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span className="text-primary font-medium">Highlighted words</span> have matching signs — click to see how to sign them
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// Sign badge component
function SignBadge({ 
  sign, 
  isExpanded, 
  onToggle 
}: { 
  sign: SignDefinition; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
          "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
          isExpanded && "bg-primary/20 border-primary/40"
        )}
      >
        <Hand className="w-3 h-3" />
        {sign.word}
      </button>

      {isExpanded && (
        <div className="bg-card border border-border rounded-lg p-3 shadow-sm space-y-2 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs capitalize">
              {sign.category}
            </Badge>
            <span className="text-sm font-semibold text-foreground">{sign.word}</span>
          </div>
          <p className="text-xs text-muted-foreground">{sign.description}</p>
          <div className="space-y-1">
            <p className="text-xs"><span className="font-medium text-foreground">Hand:</span> <span className="text-muted-foreground">{sign.handShape}</span></p>
            <p className="text-xs"><span className="font-medium text-foreground">Move:</span> <span className="text-muted-foreground">{sign.movement}</span></p>
            <p className="text-xs"><span className="font-medium text-foreground">Position:</span> <span className="text-muted-foreground">{sign.position}</span></p>
          </div>
          {sign.animationSteps.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Steps:</p>
              <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                {sign.animationSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
