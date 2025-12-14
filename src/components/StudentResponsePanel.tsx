import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Volume2, 
  VolumeX,
  Hand,
  Send,
  MessageSquare,
  Clock,
  CheckCircle
} from 'lucide-react';
import { SignDisplay } from '@/components/SignDisplay';
import { useHandDetection, classifySign } from '@/hooks/useHandDetection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeacherMessage {
  id: string;
  message: string;
  messageType: 'speech' | 'text';
  timestamp: Date;
}

interface StudentResponsePanelProps {
  sessionId: string;
  studentId: string;
  studentName: string;
  className?: string;
}

export function StudentResponsePanel({ 
  sessionId, 
  studentId, 
  studentName,
  className = "" 
}: StudentResponsePanelProps) {
  const [teacherMessages, setTeacherMessages] = useState<TeacherMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);
  const [responseConfidence, setResponseConfidence] = useState<number>(0);
  const [hasResponded, setHasResponded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stableSignCountRef = useRef(0);
  const lastSignRef = useRef<string>('');
  
  const { toast } = useToast();
  const { results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  // Listen for teacher messages
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`student-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teacher_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          const message: TeacherMessage = {
            id: newMessage.id,
            message: newMessage.message,
            messageType: newMessage.message_type,
            timestamp: new Date(newMessage.created_at),
          };
          
          setTeacherMessages(prev => [message, ...prev]);
          setHasResponded(false);
          
          // Speak the message if not muted
          if (!isMuted && 'speechSynthesis' in window) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message.message);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
          }

          toast({
            title: "Teacher Message",
            description: message.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isMuted, toast]);

  // Process hand detection results
  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current || !isResponding) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    
    if (classified && classified.sign !== 'DETECTING...' && classified.confidence > 0.7) {
      // Check for stable sign detection
      if (classified.sign === lastSignRef.current) {
        stableSignCountRef.current++;
        
        // If sign is stable for ~1 second (20 frames), accept it as response
        if (stableSignCountRef.current >= 20) {
          setCurrentResponse(classified.sign);
          setResponseConfidence(classified.confidence);
          stableSignCountRef.current = 0;
          
          // Auto-submit after 2 seconds of stable detection
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
          }
          
          responseTimeoutRef.current = setTimeout(() => {
            submitResponse(classified.sign, classified.confidence);
          }, 2000);
        }
      } else {
        lastSignRef.current = classified.sign;
        stableSignCountRef.current = 0;
      }
    }
  }, [results, isResponding]);

  const submitResponse = async (sign: string, confidence: number) => {
    if (!sign || hasResponded) return;

    try {
      await supabase
        .from('student_responses')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          student_name: studentName,
          sign: sign,
          confidence: confidence,
        });

      setHasResponded(true);
      setIsResponding(false);
      setCurrentResponse('');
      
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }

      toast({
        title: "Response Sent",
        description: `You signed: ${sign}`,
      });
    } catch (error) {
      console.error('Failed to submit response:', error);
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive",
      });
    }
  };

  const startResponding = () => {
    setIsResponding(true);
    setCurrentResponse('');
    setResponseConfidence(0);
    stableSignCountRef.current = 0;
    lastSignRef.current = '';
  };

  const stopResponding = () => {
    setIsResponding(false);
    setCurrentResponse('');
    
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
  };

  const manualSubmit = () => {
    if (currentResponse && responseConfidence > 0) {
      submitResponse(currentResponse, responseConfidence);
    }
  };

  const speakMessage = (text: string) => {
    if (!text.trim()) {
      console.log('🔇 No text to speak');
      return;
    }

    console.log('🔊 [StudentPanel] SPEAKING:', text);

    if ('speechSynthesis' in window) {
      try {
        // Stop any current speech
        speechSynthesis.cancel();
        
        // Simple, direct approach
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.8;
          utterance.volume = 1.0;
          
          utterance.onstart = () => console.log('🎤 [StudentPanel] SPEECH STARTED:', text);
          utterance.onend = () => console.log('✅ [StudentPanel] SPEECH ENDED:', text);
          utterance.onerror = (e) => console.error('❌ [StudentPanel] SPEECH ERROR:', e.error);
          
          console.log('🚀 [StudentPanel] CALLING speechSynthesis.speak()');
          speechSynthesis.speak(utterance);
          
        }, 200);

      } catch (error) {
        console.error('💥 [StudentPanel] Speech failed:', error);
      }
    } else {
      console.error('❌ [StudentPanel] Speech synthesis not supported');
    }
  };

  const latestMessage = teacherMessages[0];

  return (
    <Card className={`border-border/50 shadow-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Teacher Communication
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Listen to teacher and respond with sign language
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Latest Teacher Message */}
        {latestMessage && (
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="default">Teacher Message</Badge>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakMessage(latestMessage.message)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {latestMessage.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <p className="font-medium">{latestMessage.message}</p>
              
              {!hasResponded && (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant={isResponding ? "destructive" : "default"}
                    size="sm"
                    onClick={isResponding ? stopResponding : startResponding}
                  >
                    <Hand className="w-4 h-4 mr-2" />
                    {isResponding ? 'Stop Responding' : 'Respond with Sign'}
                  </Button>
                  
                  {hasResponded && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Responded
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Sign Language Display */}
            <SignDisplay text={latestMessage.message} />
          </div>
        )}

        {/* Response Area */}
        {isResponding && (
          <div className="space-y-3">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
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
              
              {/* Detection Status */}
              <div className="absolute top-2 left-2">
                <Badge variant="default" className="bg-primary/90 animate-pulse">
                  Detecting Signs...
                </Badge>
              </div>

              {/* Current Response */}
              {currentResponse && (
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/70 text-white p-2 rounded flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{currentResponse}</span>
                      <span className="ml-2 text-sm opacity-75">
                        {Math.round(responseConfidence * 100)}% confidence
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={manualSubmit}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Hold your sign steady for 1 second to respond
              </div>
            </div>
          </div>
        )}

        {/* Message History */}
        {teacherMessages.length > 1 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Previous Messages</h4>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {teacherMessages.slice(1, 4).map((message) => (
                <div
                  key={message.id}
                  className="p-2 bg-muted/30 rounded text-sm flex items-center justify-between"
                >
                  <p className="flex-1">{message.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakMessage(message.message)}
                  >
                    <Volume2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!latestMessage && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Waiting for teacher to send a message...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}