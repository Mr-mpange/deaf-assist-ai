import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Hand, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Loader2,
  Send,
  Clock
} from 'lucide-react';
import { useHandDetection, classifySign, SignPrediction } from '@/hooks/useHandDetection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface RaiseHandPanelProps {
  sessionId: string;
  studentId: string;
  studentName: string;
  isCalledOn: boolean;
  onAnswerSubmitted: (sign: string, confidence: number) => void;
  onLowerHand: () => void;
  liveStream?: MediaStream | null; // Use existing live camera stream
}

export function RaiseHandPanel({
  sessionId,
  studentId,
  studentName,
  isCalledOn,
  onAnswerSubmitted,
  onLowerHand,
  liveStream,
}: RaiseHandPanelProps) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWord, setCurrentWord] = useState<string[]>([]); // Word building
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSignRef = useRef<string>('');
  const signStableCountRef = useRef<number>(0);
  
  // Performance optimization - throttle MediaPipe calls
  const lastDetectionTimeRef = useRef<number>(0);
  const detectionIntervalRef = useRef<number>(100); // Start with 100ms intervals (10fps)
  const fastSignerModeRef = useRef<boolean>(false);
  
  const { toast } = useToast();
  const { isLoading: isModelLoading, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  // Start dedicated camera for sign detection (like Practice Mode)
  const startCamera = async () => {
    try {
      console.log('🎥 [RaiseHand] Starting dedicated camera for sign detection');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 640, max: 1280 }, 
          height: { ideal: 480, max: 720 },
          aspectRatio: 4/3
        },
        audio: false
      });
      
      console.log('✅ [RaiseHand] Camera stream obtained');
      
      setIsCameraOn(true);
      streamRef.current = stream;
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ [RaiseHand] Video metadata loaded');
            videoRef.current?.play().then(() => {
              console.log('✅ [RaiseHand] Video playing');
            }).catch(err => {
              console.error('❌ [RaiseHand] Video play failed:', err);
            });
          };
          
          toast({
            title: "Camera Ready",
            description: "Show your sign language answer",
          });
        }
      }, 50);
    } catch (err: any) {
      console.error('❌ [RaiseHand] Camera failed:', err);
      
      let errorMessage = "Could not access camera";
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera found";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application";
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
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
    setPrediction(null);
    
    // Reset detection parameters
    fastSignerModeRef.current = false;
    detectionIntervalRef.current = 100;
    signStableCountRef.current = 0;
    lastSignRef.current = '';
  };

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
    
    // Reset detection parameters
    fastSignerModeRef.current = false;
    detectionIntervalRef.current = 100;
    signStableCountRef.current = 0;
    lastSignRef.current = '';
  };

  const startDetection = useCallback(() => {
    if (!isCameraOn || isModelLoading) {
      console.log('⚠️ [RaiseHand] Cannot start detection:', { isCameraOn, isModelLoading });
      return;
    }
    
    console.log('✅ [RaiseHand] Starting throttled detection loop');
    setIsDetecting(true);
    setPrediction(null);
    
    const detect = async () => {
      const now = Date.now();
      const timeSinceLastDetection = now - lastDetectionTimeRef.current;
      
      // Use adaptive detection frequency
      const currentInterval = fastSignerModeRef.current ? 50 : detectionIntervalRef.current;
      
      if (timeSinceLastDetection >= currentInterval) {
        await detectHands();
        lastDetectionTimeRef.current = now;
      }
      
      if (isDetecting) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };
    
    detect();
  }, [isCameraOn, isModelLoading, detectHands, isDetecting]);

  // Broadcast detected signs to teacher in real-time (store in student_responses)
  const broadcastSignToTeacher = useCallback(async (sign: string, confidence: number) => {
    if (!isCalledOn) return;
    
    try {
      // Insert sign detection into student_responses for real-time tracking
      await supabase
        .from('student_responses')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          student_name: studentName,
          detected_sign: sign,
          confidence: confidence,
          response_type: 'sign_detection',
        });
    } catch (err) {
      console.error('Error broadcasting sign:', err);
    }
  }, [isCalledOn, sessionId, studentId, studentName]);

  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    if (classified && classified.sign !== 'DETECTING...') {
      console.log('🤚 [RaiseHand] Sign detected:', classified.sign, 'confidence:', classified.confidence);
      setPrediction(classified);
      
      // Detect fast signing patterns
      if (classified.sign !== lastSignRef.current && lastSignRef.current !== '') {
        // Sign changed quickly - might be a fast signer
        fastSignerModeRef.current = true;
        detectionIntervalRef.current = Math.max(50, detectionIntervalRef.current - 10); // Increase frequency
        console.log('🏃‍♂️ [RaiseHand] Fast signer detected - increasing detection frequency to', detectionIntervalRef.current, 'ms');
      }
      
      // Broadcast to teacher in real-time
      if (classified.confidence > 0.6) {
        broadcastSignToTeacher(classified.sign, classified.confidence);
      }
      
      // Auto-submit high confidence answers (like StudentResponsePanel)
      if (isCalledOn && classified.confidence > 0.85 && classified.sign !== 'DETECTING...') {
        if (classified.sign === lastSignRef.current) {
          signStableCountRef.current++;
          
          // Adaptive stability threshold based on detection frequency
          const stabilityThreshold = fastSignerModeRef.current ? 3 : 8;
          
          // If sign is stable, auto-submit
          if (signStableCountRef.current >= stabilityThreshold) {
            console.log('🎯 [RaiseHand] Auto-submitting stable high-confidence answer:', classified.sign);
            
            // Reset to normal detection speed after successful detection
            fastSignerModeRef.current = false;
            detectionIntervalRef.current = 100;
            
            handleSubmitAnswer();
            return;
          }
        } else {
          lastSignRef.current = classified.sign;
          signStableCountRef.current = 0;
        }
      }
      
      // Word building logic for alphabet signs
      if (classified.confidence > 0.75 && classified.category === 'alphabet' && classified.sign.length === 1) {
        if (classified.sign === lastSignRef.current) {
          signStableCountRef.current++;
          
          // If sign is stable for ~1 second (20 frames), add to word
          if (signStableCountRef.current === 20) {
            setCurrentWord(prev => [...prev, classified.sign]);
            toast({
              title: "Letter Added",
              description: `Added "${classified.sign}" to word`,
            });
            signStableCountRef.current = 0; // Reset after adding
          }
        } else {
          lastSignRef.current = classified.sign;
          signStableCountRef.current = 0;
        }
      }
    } else {
      // No good detection - slow down to save resources
      if (detectionIntervalRef.current < 150) {
        detectionIntervalRef.current = Math.min(150, detectionIntervalRef.current + 5);
      }
    }
  }, [results, drawLandmarks, broadcastSignToTeacher, toast, isCalledOn]);

  const handleRaiseHand = async () => {
    try {
      const { error } = await supabase
        .from('raised_hands')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          student_name: studentName,
          status: 'raised',
        });

      if (error) throw error;
      
      setHasRaisedHand(true);
      toast({
        title: "Hand Raised!",
        description: "The teacher will call on you soon",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to raise hand",
        variant: "destructive",
      });
    }
  };

  const handleLowerHand = async () => {
    try {
      await supabase
        .from('raised_hands')
        .delete()
        .eq('session_id', sessionId)
        .eq('student_id', studentId);
      
      setHasRaisedHand(false);
      stopCamera();
      onLowerHand();
    } catch (err) {
      console.error('Error lowering hand:', err);
    }
  };

  const handleSubmitAnswer = async () => {
    // Use built word if available, otherwise use current prediction
    const answerSign = currentWord.length > 0 
      ? currentWord.join('') 
      : prediction?.sign;
    
    const answerConfidence = currentWord.length > 0 
      ? 0.9 
      : prediction?.confidence || 0;

    if (!answerSign || answerSign === 'DETECTING...') {
      toast({
        title: "No answer",
        description: "Please show your answer sign or build a word",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('raised_hands')
        .update({
          status: 'answered',
          answer_sign: answerSign,
          answer_confidence: answerConfidence,
        })
        .eq('session_id', sessionId)
        .eq('student_id', studentId);

      if (error) throw error;
      
      onAnswerSubmitted(answerSign, answerConfidence);
      
      toast({
        title: "Answer Submitted!",
        description: `Your answer: ${answerSign}`,
      });
      
      setCurrentWord([]);
      stopCamera();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-start camera when called on (like Practice Mode)
  useEffect(() => {
    if (isCalledOn && !isCameraOn) {
      console.log('🎥 [RaiseHand] Student called on - auto-starting camera');
      startCamera();
      
      toast({
        title: "You've been called on!",
        description: "Camera starting for your answer",
      });
    }
  }, [isCalledOn, isCameraOn, toast]);

  // Auto-start detection when camera is ready
  useEffect(() => {
    if (isCalledOn && isCameraOn && !isModelLoading && !isDetecting) {
      console.log('🎥 [RaiseHand] Camera ready - starting detection');
      setTimeout(() => {
        startDetection();
      }, 500);
    }
  }, [isCalledOn, isCameraOn, isModelLoading, isDetecting, startDetection]);

  return (
    <Card className={cn(
      "border-border/50 shadow-card transition-all",
      isCalledOn && "border-primary ring-2 ring-primary/20"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Hand className="w-5 h-5" />
            {isCalledOn ? "Your Turn to Answer!" : "Raise Hand"}
          </span>
          {hasRaisedHand && !isCalledOn && (
            <Badge variant="secondary" className="animate-pulse">
              Hand Raised
            </Badge>
          )}
          {isCalledOn && (
            <Badge variant="default" className="animate-pulse bg-primary">
              Called On!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCalledOn ? (
          <>
            {/* Show status in sidebar */}
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Hand className="w-8 h-8 text-primary animate-bounce" />
              </div>
              <p className="text-primary font-medium">
                Answer camera is open in center of screen
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Show your sign language answer
              </p>
            </div>
          </>
        ) : hasRaisedHand ? (
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Hand className="w-8 h-8 text-primary animate-bounce" />
              </div>
              <p className="text-muted-foreground">
                Waiting for teacher to call on you...
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLowerHand}>
              <XCircle className="w-4 h-4 mr-2" />
              Lower Hand
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Click to raise your hand and answer a question using sign language
            </p>
            <Button variant="gradient" className="w-full" onClick={handleRaiseHand}>
              <Hand className="w-4 h-4 mr-2" />
              Raise Hand
            </Button>
          </>
        )}
      </CardContent>

      {/* Centered Answer Modal */}
      <Dialog open={isCalledOn} onOpenChange={(open) => !open && handleLowerHand()}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-2xl text-center">
              Your Turn to Answer!
            </DialogTitle>
            <p className="text-center text-muted-foreground text-lg">
              Show your sign language answer to the camera
            </p>
          </DialogHeader>
          
          <div className="flex-1 p-6 pt-0 min-h-0">
            <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
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
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  
                  {/* Detection Status */}
                  <div className="absolute top-4 left-4">
                    {isDetecting ? (
                      <Badge variant="default" className="bg-green-600 animate-pulse text-lg px-4 py-2">
                        Detecting Signs...
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-lg px-4 py-2">
                        Camera Ready
                      </Badge>
                    )}
                  </div>

                  {/* Current Prediction */}
                  {prediction && isDetecting && prediction.sign !== 'DETECTING...' && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/80 text-white p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-6 h-6 text-yellow-400" />
                          <div>
                            <span className="font-bold text-2xl">{prediction.sign}</span>
                            <span className="ml-3 text-lg opacity-75">
                              {Math.round(prediction.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={handleSubmitAnswer}
                          disabled={isSubmitting}
                          className="ml-4"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              Submit Now
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Current Word Being Built */}
                  {currentWord.length > 0 && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-black/60 text-white p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm opacity-75">Building word:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentWord([])}
                            className="text-white hover:bg-white/20 h-6 px-2"
                          >
                            Clear
                          </Button>
                        </div>
                        <p className="font-mono text-2xl font-bold text-center">
                          {currentWord.join('')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-black/60 text-white p-3 rounded-lg text-sm text-center max-w-md">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Instructions:</span>
                      </div>
                      <p className="text-xs opacity-90">
                        {currentWord.length > 0 
                          ? "Hold each letter for 1 second to add it to your word" 
                          : "Make your sign clearly and hold steady • Answer will auto-submit when detected"}
                      </p>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="absolute bottom-4 right-4">
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleLowerHand}
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Cancel Answer
                    </Button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <CameraOff className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl text-muted-foreground mb-2">Setting up camera...</p>
                  <p className="text-sm text-muted-foreground">Please allow camera access</p>
                </div>
              )}

              {isModelLoading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">Loading sign detection...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}