import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Camera, 
  CameraOff, 
  Send,
  Sparkles,
  Loader2,
  Volume2,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { useHandDetection, classifySign, SignPrediction } from '@/hooks/useHandDetection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SignMessage {
  id: string;
  session_id: string;
  participant_id: string;
  participant_name: string;
  sign_text: string;
  confidence: number;
  created_at: string;
}

interface LiveSignDetectionFeedProps {
  sessionId: string;
  participantId: string;
  participantName: string;
  className?: string;
  autoStart?: boolean;
}

export function LiveSignDetectionFeed({ 
  sessionId, 
  participantId, 
  participantName, 
  className,
  autoStart = false
}: LiveSignDetectionFeedProps) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [signMessages, setSignMessages] = useState<SignMessage[]>([]);
  const [currentWord, setCurrentWord] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSignRef = useRef<string>('');
  const signStableCountRef = useRef<number>(0);
  
  const { toast } = useToast();
  const { isLoading: isModelLoading, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  // Auto-start camera and detection if enabled
  useEffect(() => {
    if (autoStart && sessionId && !isCameraOn) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(async () => {
        try {
          await startCamera();
          
          toast({
            title: "Sign Detection Started",
            description: "Automatically detecting sign language for teaching",
          });
          
          // Start detection after camera is ready
          setTimeout(() => {
            if (!isModelLoading) {
              startDetection();
            }
          }, 1000);
        } catch (error) {
          console.error('Auto-start failed:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionId, isCameraOn, isModelLoading, toast]);

  // Define startDetection before using it in effects
  const startDetection = useCallback(() => {
    if (!isCameraOn || isModelLoading) return;
    
    setIsDetecting(true);
    
    const detect = async () => {
      await detectHands();
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  }, [isCameraOn, isModelLoading, detectHands]);

  // Auto-start detection when model is ready (for auto-start mode)
  useEffect(() => {
    if (autoStart && isCameraOn && !isDetecting && !isModelLoading) {
      const timer = setTimeout(() => {
        startDetection();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, isCameraOn, isDetecting, isModelLoading, startDetection]);

  // Subscribe to sign messages from all participants
  useEffect(() => {
    if (!sessionId) return;

    // Fetch existing messages
    fetchSignMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`sign-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sign_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as SignMessage;
          setSignMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchSignMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('sign_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      if (data) setSignMessages(data);
    } catch (error) {
      console.error('Error fetching sign messages:', error);
    }
  };

  const startCamera = async () => {
    try {
      console.log('🎥 [LiveSignFeed] Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      });
      
      console.log('✅ [LiveSignFeed] Camera stream obtained');
      
      setIsCameraOn(true);
      streamRef.current = stream;
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      }, 50);
      
    } catch (err) {
      console.error('💥 [LiveSignFeed] Camera start failed:', err);
      toast({
        title: "Camera Error",
        description: "Could not access camera for sign detection",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsDetecting(false);
  };

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  };

  // Process detection results
  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    
    if (classified && classified.sign !== 'DETECTING...' && classified.confidence > 0.75) {
      setPrediction(classified);
      
      // Track stable signs for word building
      if (classified.sign === lastSignRef.current) {
        signStableCountRef.current++;
        
        // If sign is stable for ~1 second, add to word or send message
        if (signStableCountRef.current === 20) {
          if (classified.category === 'alphabet' && classified.sign.length === 1) {
            setCurrentWord(prev => [...prev, classified.sign]);
          } else if (classified.category !== 'alphabet') {
            // Send non-alphabet signs immediately
            sendSignMessage(classified.sign, classified.confidence);
          }
        }
      } else {
        lastSignRef.current = classified.sign;
        signStableCountRef.current = 0;
      }
    }
  }, [results, drawLandmarks]);

  const sendSignMessage = async (signText: string, confidence: number) => {
    try {
      const { error } = await supabase
        .from('sign_messages')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          participant_name: participantName,
          sign_text: signText,
          confidence: confidence,
        });

      if (error) throw error;

      toast({
        title: "Sign Detected",
        description: `Shared: ${signText}`,
      });
    } catch (error) {
      console.error('Error sending sign message:', error);
      toast({
        title: "Error",
        description: "Failed to share sign",
        variant: "destructive",
      });
    }
  };

  const sendCurrentWord = () => {
    if (currentWord.length === 0) return;
    
    const word = currentWord.join('');
    sendSignMessage(word, 0.9);
    setCurrentWord([]);
  };

  const speakMessage = (text: string) => {
    if (!text.trim()) return;

    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    try {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      // Try to get a good voice
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const englishVoice = voices.find(voice => voice.lang.includes('en')) || voices[0];
        utterance.voice = englishVoice;
      }
      
      utterance.onstart = () => console.log('Speaking:', text);
      utterance.onerror = (e) => console.error('Speech error:', e.error);
      
      speechSynthesis.speak(utterance);
      
      // Chrome fix - retry if not speaking
      setTimeout(() => {
        if (!speechSynthesis.speaking) {
          speechSynthesis.speak(utterance);
        }
      }, 100);
      
    } catch (error) {
      console.error('Speech failed:', error);
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Card className={cn("border-border/50 shadow-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Live Sign Feed
            <Badge variant="secondary" className="text-xs">
              {signMessages.length}
            </Badge>
            {autoStart && (
              <Badge variant="default" className="text-xs bg-green-600">
                Auto
              </Badge>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={toggleVisibility}>
            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isVisible && (
        <CardContent className="space-y-4">
          {/* Camera view for sign detection */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isCameraOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover bg-black"
                  style={{ minHeight: '150px' }}
                />
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CameraOff className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Start camera to detect and share signs
                </p>
              </div>
            )}

            {isModelLoading && isCameraOn && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* Current detection */}
            {prediction && isDetecting && prediction.sign !== 'DETECTING...' && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-background/90 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="font-semibold text-xs">{prediction.sign}</span>
                  </div>
                  <Badge variant={prediction.confidence >= 0.8 ? "default" : "secondary"} className="text-xs">
                    {Math.round(prediction.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            )}

            {/* Detection indicator */}
            {isDetecting && (
              <div className="absolute top-2 left-2">
                <Badge variant="default" className="bg-primary/90 animate-pulse text-xs">
                  Detecting
                </Badge>
              </div>
            )}
          </div>

          {/* Current word being built */}
          {currentWord.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <span className="text-xs text-muted-foreground">Building:</span>
              <span className="font-mono font-bold text-primary text-sm">{currentWord.join('')}</span>
              <div className="ml-auto flex gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => speakMessage(currentWord.join(''))}
                  title="Speak current word"
                >
                  <Volume2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={sendCurrentWord} title="Send message">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              variant={isCameraOn ? "destructive" : "default"}
              size="sm"
              onClick={isCameraOn ? stopCamera : startCamera}
              className="flex-1"
            >
              {isCameraOn ? (
                <>
                  <CameraOff className="w-3 h-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3 mr-1" />
                  Start
                </>
              )}
            </Button>
            
            {isCameraOn && (
              <Button
                variant={isDetecting ? "secondary" : "default"}
                size="sm"
                onClick={isDetecting ? stopDetection : startDetection}
                disabled={isModelLoading}
                className="flex-1"
              >
                {isDetecting ? "Pause" : "Detect"}
              </Button>
            )}
          </div>

          {/* Live sign messages from all participants */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Live Signs from All Participants</span>
            </div>
            
            <ScrollArea className="h-32 border rounded-lg p-2">
              {signMessages.length > 0 ? (
                <div className="space-y-2">
                  {signMessages.slice(-10).map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg text-sm",
                        msg.participant_id === participantId 
                          ? "bg-primary/10 border border-primary/20" 
                          : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={msg.participant_id === participantId ? "default" : "outline"} 
                          className="text-xs"
                        >
                          {msg.participant_id === participantId ? 'You' : msg.participant_name}
                        </Badge>
                        <span className="font-medium">{msg.sign_text}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(msg.confidence * 100)}%
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => speakMessage(msg.sign_text)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-xs">No signs detected yet</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Signs are automatically shared with all participants in real-time
          </p>
        </CardContent>
      )}
    </Card>
  );
}