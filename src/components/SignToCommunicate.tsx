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
  Trash2
} from 'lucide-react';
import { useHandDetection, classifySign, SignPrediction } from '@/hooks/useHandDetection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SignMessage {
  id: string;
  sign: string;
  confidence: number;
  timestamp: Date;
  category?: string;
}

interface SignToCommunicateProps {
  onMessageSend?: (message: string) => void;
  className?: string;
}

export function SignToCommunicate({ onMessageSend, className }: SignToCommunicateProps) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [messages, setMessages] = useState<SignMessage[]>([]);
  const [currentWord, setCurrentWord] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSignRef = useRef<string>('');
  const signStableCountRef = useRef<number>(0);
  
  const { toast } = useToast();
  const { isLoading: isModelLoading, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOn(true);
      }
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Could not access camera",
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

  const startDetection = useCallback(() => {
    if (!isCameraOn || isModelLoading) return;
    
    setIsDetecting(true);
    
    const detect = async () => {
      await detectHands();
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  }, [isCameraOn, isModelLoading, detectHands]);

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  };

  // Process results
  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    
    if (classified && classified.sign !== 'DETECTING...' && classified.confidence > 0.75) {
      setPrediction(classified);
      
      // Track stable signs for word building
      if (classified.sign === lastSignRef.current) {
        signStableCountRef.current++;
        
        // If sign is stable for ~1 second (30 frames at 30fps), add to word
        if (signStableCountRef.current === 20) {
          // Only add alphabet letters to word building
          if (classified.category === 'alphabet' && classified.sign.length === 1) {
            setCurrentWord(prev => [...prev, classified.sign]);
          } else if (classified.category !== 'alphabet') {
            // For non-alphabet signs, add as complete message
            addMessage(classified);
          }
        }
      } else {
        lastSignRef.current = classified.sign;
        signStableCountRef.current = 0;
      }
    }
  }, [results, drawLandmarks]);

  const addMessage = (sign: SignPrediction) => {
    const newMessage: SignMessage = {
      id: Date.now().toString(),
      sign: sign.sign,
      confidence: sign.confidence,
      timestamp: new Date(),
      category: sign.category,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendCurrentWord = () => {
    if (currentWord.length === 0) return;
    
    const word = currentWord.join('');
    const newMessage: SignMessage = {
      id: Date.now().toString(),
      sign: word,
      confidence: 0.9,
      timestamp: new Date(),
      category: 'word',
    };
    setMessages(prev => [...prev, newMessage]);
    setCurrentWord([]);
    
    if (onMessageSend) {
      onMessageSend(word);
    }
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentWord([]);
  };

  return (
    <Card className={cn("border-border/50 shadow-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Sign to Communicate
          </span>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera view */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {isCameraOn ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
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
              <CameraOff className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Start camera to communicate</p>
            </div>
          )}

          {isModelLoading && isCameraOn && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Current detection */}
          {prediction && isDetecting && prediction.sign !== 'DETECTING...' && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-background/90 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{prediction.sign}</span>
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
              <Badge variant="default" className="bg-primary/90 animate-pulse">
                Detecting
              </Badge>
            </div>
          )}
        </div>

        {/* Current word being built */}
        {currentWord.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Building:</span>
            <span className="font-mono font-bold text-primary">{currentWord.join('')}</span>
            <Button size="sm" variant="ghost" onClick={sendCurrentWord} className="ml-auto">
              <Send className="w-4 h-4" />
            </Button>
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
                <CameraOff className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
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

        {/* Messages */}
        {messages.length > 0 && (
          <ScrollArea className="h-32 border rounded-lg p-2">
            <div className="space-y-2">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {msg.category || 'sign'}
                    </Badge>
                    <span className="font-medium">{msg.sign}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => speakMessage(msg.sign)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Hold a letter sign steady to add to word. Use "Speak" to vocalize.
        </p>
      </CardContent>
    </Card>
  );
}