import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { DetectionPerformanceMonitor } from '@/components/DetectionPerformanceMonitor';
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
  isCalledOn?: boolean; // Add this to know if student is called on
  className?: string;
}

export function StudentResponsePanel({ 
  sessionId, 
  studentId, 
  studentName,
  isCalledOn = false,
  className = "" 
}: StudentResponsePanelProps) {
  const [teacherMessages, setTeacherMessages] = useState<TeacherMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);
  const [responseConfidence, setResponseConfidence] = useState<number>(0);
  const [hasResponded, setHasResponded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFastSignerMode, setIsFastSignerMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stableSignCountRef = useRef(0);
  const lastSignRef = useRef<string>('');
  
  const { toast } = useToast();
  const { results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

  // Optimized hand detection with throttling
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const detectionIntervalRef = useRef<number>(100); // Start with 100ms intervals (10fps)
  const fastSignerModeRef = useRef<boolean>(false);

  // Start hand detection loop when responding
  useEffect(() => {
    if (!isResponding || !videoRef.current) {
      // Stop detection when not responding
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const detect = async () => {
      const now = Date.now();
      const timeSinceLastDetection = now - lastDetectionTimeRef.current;
      
      // Use adaptive detection frequency
      const currentInterval = fastSignerModeRef.current ? 50 : detectionIntervalRef.current;
      
      if (timeSinceLastDetection >= currentInterval) {
        await detectHands();
        lastDetectionTimeRef.current = now;
      }
      
      if (isResponding) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };
    
    detect();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isResponding, detectHands]);

  // Process hand detection results with adaptive optimization
  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current || !isResponding) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    
    if (classified && classified.sign !== 'DETECTING...' && classified.confidence > 0.7) {
      // Detect fast signing patterns
      if (classified.sign !== lastSignRef.current && lastSignRef.current !== '') {
        // Sign changed quickly - might be a fast signer
        fastSignerModeRef.current = true;
        setIsFastSignerMode(true);
        detectionIntervalRef.current = Math.max(50, detectionIntervalRef.current - 10); // Increase frequency
        console.log('🏃‍♂️ Fast signer detected - increasing detection frequency to', detectionIntervalRef.current, 'ms');
      }
      
      // Check for stable sign detection
      if (classified.sign === lastSignRef.current) {
        stableSignCountRef.current++;
        
        // Adaptive stability threshold based on detection frequency
        const stabilityThreshold = fastSignerModeRef.current ? 3 : 8; // Fewer frames needed for fast signers
        
        if (stableSignCountRef.current >= stabilityThreshold) {
          setCurrentResponse(classified.sign);
          setResponseConfidence(classified.confidence);
          stableSignCountRef.current = 0;
          
          // Reset to normal detection speed after successful detection
          fastSignerModeRef.current = false;
          setIsFastSignerMode(false);
          detectionIntervalRef.current = 100;
          
          // Auto-submit after shorter time for fast signers
          const submitDelay = fastSignerModeRef.current ? 1000 : 2000;
          
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
          }
          
          responseTimeoutRef.current = setTimeout(() => {
            submitResponse(classified.sign, classified.confidence);
          }, submitDelay);
        }
      } else {
        lastSignRef.current = classified.sign;
        stableSignCountRef.current = 0;
      }
    } else {
      // No good detection - slow down to save resources
      if (detectionIntervalRef.current < 150) {
        detectionIntervalRef.current = Math.min(150, detectionIntervalRef.current + 5);
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
          detected_sign: sign,
          confidence: confidence,
          response_type: 'answer',
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

  const startResponding = async () => {
    setIsResponding(true);
    setCurrentResponse('');
    setResponseConfidence(0);
    stableSignCountRef.current = 0;
    lastSignRef.current = '';

    // Initialize camera when starting to respond
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to access camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsResponding(false);
    }
  };

  const stopResponding = () => {
    setIsResponding(false);
    setCurrentResponse('');
    
    // Stop detection loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset detection parameters
    fastSignerModeRef.current = false;
    setIsFastSignerMode(false);
    detectionIntervalRef.current = 100;
    stableSignCountRef.current = 0;
    lastSignRef.current = '';
    
    // Stop camera stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
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
              
              {!hasResponded && !isCalledOn && (
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

              {/* Show message when called on */}
              {isCalledOn && (
                <div className="mt-3 p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary font-medium">
                    You're called on! Use the "Your Turn to Answer" interface to respond.
                  </p>
                </div>
              )}
            </div>

            {/* Sign Language Display */}
            <SignDisplay text={latestMessage.message} />
          </div>
        )}

        {/* Response Status */}
        {isResponding && (
          <div className="text-center py-4">
            <Badge variant="default" className="bg-primary/90 animate-pulse">
              Camera is open - Make your sign response
            </Badge>
          </div>
        )}

        {/* Camera Modal for Response - Only show if not called on */}
        <Dialog open={isResponding && !isCalledOn} onOpenChange={(open) => !open && stopResponding()}>
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
            <DialogHeader className="p-6 pb-4 flex-shrink-0">
              <DialogTitle className="text-2xl text-center">
                Respond with Sign Language
              </DialogTitle>
              <p className="text-center text-muted-foreground text-lg">
                Hold your sign steady for 1 second to submit your response
              </p>
            </DialogHeader>
            
            <div className="flex-1 p-6 pt-0 min-h-0">
              <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                
                {/* Detection Status */}
                <div className="absolute top-4 left-4 space-y-2">
                  <Badge variant="default" className="bg-primary/90 animate-pulse text-lg px-4 py-2">
                    Detecting Signs...
                  </Badge>
                  {isFastSignerMode && (
                    <Badge variant="secondary" className="bg-orange-500/90 text-white text-sm px-3 py-1">
                      🏃‍♂️ Fast Signer Mode
                    </Badge>
                  )}
                </div>

                {/* Current Response */}
                {currentResponse && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/80 text-white p-4 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-2xl">{currentResponse}</span>
                        <span className="ml-3 text-lg opacity-75">
                          {Math.round(responseConfidence * 100)}% confidence
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={manualSubmit}
                        className="ml-4"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Submit Now
                      </Button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="absolute top-4 right-4">
                  <div className="bg-black/60 text-white p-3 rounded-lg text-sm max-w-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Instructions:</span>
                    </div>
                    <ul className="space-y-1 text-xs">
                      <li>• Position yourself clearly in the camera</li>
                      <li>• Make your sign clearly and hold steady</li>
                      <li>• System adapts to your signing speed</li>
                      <li>• Fast signers get quicker detection</li>
                      <li>• Click "Submit Now" to send immediately</li>
                    </ul>
                  </div>
                </div>

                {/* Performance Monitor (for debugging) */}
                <div className="absolute bottom-4 left-4">
                  <DetectionPerformanceMonitor isActive={isResponding} />
                </div>

                {/* Close Button */}
                <div className="absolute bottom-4 right-4">
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={stopResponding}
                  >
                    Cancel Response
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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