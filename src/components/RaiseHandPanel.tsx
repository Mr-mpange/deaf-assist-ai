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
}

export function RaiseHandPanel({
  sessionId,
  studentId,
  studentName,
  isCalledOn,
  onAnswerSubmitted,
  onLowerHand,
}: RaiseHandPanelProps) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
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

  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    if (classified && classified.sign !== 'DETECTING...') {
      setPrediction(classified);
    }
  }, [results, drawLandmarks]);

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
    if (!prediction || prediction.sign === 'DETECTING...') {
      toast({
        title: "No sign detected",
        description: "Please show your answer sign clearly",
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
          answer_sign: prediction.sign,
          answer_confidence: prediction.confidence,
        })
        .eq('session_id', sessionId)
        .eq('student_id', studentId);

      if (error) throw error;
      
      onAnswerSubmitted(prediction.sign, prediction.confidence);
      
      toast({
        title: "Answer Submitted!",
        description: `Your answer: ${prediction.sign}`,
      });
      
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

  // Auto-start camera when called on
  useEffect(() => {
    if (isCalledOn && !isCameraOn) {
      startCamera();
    }
  }, [isCalledOn]);

  // Auto-start detection when camera is ready and called on
  useEffect(() => {
    if (isCalledOn && isCameraOn && !isModelLoading && !isDetecting) {
      startDetection();
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
            {/* Camera view for answering */}
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <CameraOff className="w-8 h-8 text-muted-foreground" />
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

            <p className="text-sm text-muted-foreground text-center">
              Show your sign language answer to the camera
            </p>

            <div className="flex gap-2">
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || !prediction || prediction.sign === 'DETECTING...'}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Answer
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