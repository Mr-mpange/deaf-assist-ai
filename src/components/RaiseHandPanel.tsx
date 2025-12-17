import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Hand, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Loader2,
  Send
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
  
  const { toast } = useToast();
  const { isLoading: isModelLoading, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  // Start dedicated camera for sign detection (like Practice Mode)
  const startCamera = async () => {
    try {
      console.log('🎥 [RaiseHand] Starting dedicated camera for sign detection');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
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
  };

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  };

  const startDetection = useCallback(() => {
    if (!isCameraOn || isModelLoading) {
      console.log('⚠️ [RaiseHand] Cannot start detection:', { isCameraOn, isModelLoading });
      return;
    }
    
    console.log('✅ [RaiseHand] Starting detection loop');
    setIsDetecting(true);
    setPrediction(null);
    
    const detect = async () => {
      await detectHands();
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  }, [isCameraOn, isModelLoading, detectHands]);

  // Broadcast detected signs to teacher in real-time
  const broadcastSignToTeacher = useCallback(async (sign: string, confidence: number) => {
    if (!isCalledOn) return;
    
    try {
      // Update the raised_hand record with current detection
      await supabase
        .from('raised_hands')
        .update({
          current_sign: sign,
          current_confidence: confidence,
          last_detected_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('student_id', studentId);
    } catch (err) {
      console.error('Error broadcasting sign:', err);
    }
  }, [isCalledOn, sessionId, studentId]);

  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    if (classified && classified.sign !== 'DETECTING...') {
      console.log('🤚 [RaiseHand] Sign detected:', classified.sign, 'confidence:', classified.confidence);
      setPrediction(classified);
      
      // Broadcast to teacher in real-time
      if (classified.confidence > 0.6) {
        broadcastSignToTeacher(classified.sign, classified.confidence);
      }
      
      // Word building logic (like Practice Mode)
      if (classified.confidence > 0.75) {
        if (classified.sign === lastSignRef.current) {
          signStableCountRef.current++;
          
          // If sign is stable for ~1 second (20 frames at 60fps), add to word
          if (signStableCountRef.current === 20) {
            if (classified.category === 'alphabet' && classified.sign.length === 1) {
              setCurrentWord(prev => [...prev, classified.sign]);
              toast({
                title: "Letter Added",
                description: `Added "${classified.sign}" to word`,
              });
            }
          }
        } else {
          lastSignRef.current = classified.sign;
          signStableCountRef.current = 0;
        }
      }
    }
  }, [results, drawLandmarks, broadcastSignToTeacher, toast]);

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
            {/* Camera view for answering - dedicated camera like Practice Mode */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {isCameraOn ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover bg-black"
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  {isDetecting && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default" className="bg-green-600 animate-pulse">
                        Detecting Signs...
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <CameraOff className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Waiting for camera...</p>
                </div>
              )}

              {isModelLoading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

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
            </div>

            {/* Current word being built */}
            {currentWord.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Building word:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentWord([])}
                  >
                    Clear
                  </Button>
                </div>
                <p className="font-mono text-2xl font-bold text-primary text-center">
                  {currentWord.join('')}
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              {currentWord.length > 0 
                ? "Hold each letter for 1 second to add it to your word" 
                : "Show your sign language answer to the camera"}
            </p>

            <div className="flex gap-2">
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || (!prediction && currentWord.length === 0)}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit {currentWord.length > 0 ? 'Word' : 'Answer'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleLowerHand}>
                <XCircle className="w-4 h-4" />
              </Button>
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
    </Card>
  );
}