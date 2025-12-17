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
  const [isDetecting, setIsDetecting] = useState(false);
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { toast } = useToast();
  const { isLoading: isModelLoading, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  // Use the live stream from the video call
  useEffect(() => {
    if (liveStream && videoRef.current && isCalledOn) {
      console.log('🎥 [RaiseHand] Using live stream for sign detection');
      console.log('🎥 [RaiseHand] Stream tracks:', liveStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      
      const video = videoRef.current;
      video.srcObject = liveStream;
      
      // Wait for video metadata to load
      video.onloadedmetadata = () => {
        console.log('✅ [RaiseHand] Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
        video.play().catch(err => {
          console.error('❌ [RaiseHand] Video play failed:', err);
        });
      };
      
      // Fallback: try to play immediately
      video.play().catch(err => {
        console.log('⏳ [RaiseHand] Waiting for metadata before playing...');
      });
    }
  }, [liveStream, isCalledOn]);

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDetecting(false);
  };

  const startDetection = useCallback(() => {
    if (!liveStream || isModelLoading) {
      console.log('⚠️ [RaiseHand] Cannot start detection:', { hasStream: !!liveStream, isModelLoading });
      return;
    }
    
    if (!videoRef.current) {
      console.log('⚠️ [RaiseHand] Video element not ready');
      return;
    }
    
    console.log('✅ [RaiseHand] Starting detection loop');
    setIsDetecting(true);
    
    const detect = async () => {
      await detectHands();
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  }, [liveStream, isModelLoading, detectHands]);

  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    const classified = classifySign(results.landmarks);
    if (classified && classified.sign !== 'DETECTING...') {
      console.log('🤚 [RaiseHand] Sign detected:', classified.sign, 'confidence:', classified.confidence);
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
      stopDetection();
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
      
      stopDetection();
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

  // Auto-start detection when called on and live stream is available
  useEffect(() => {
    if (isCalledOn && liveStream && !isModelLoading && !isDetecting) {
      console.log('🎥 [RaiseHand] Student called on - starting sign detection');
      console.log('🎥 [RaiseHand] isModelLoading:', isModelLoading);
      console.log('🎥 [RaiseHand] isDetecting:', isDetecting);
      console.log('🎥 [RaiseHand] liveStream:', !!liveStream);
      console.log('🎥 [RaiseHand] videoRef.current:', !!videoRef.current);
      
      // Small delay to ensure video element is ready
      setTimeout(() => {
        startDetection();
        
        toast({
          title: "You've been called on!",
          description: "Show your sign language answer to the camera",
        });
      }, 500);
    }
  }, [isCalledOn, liveStream, isModelLoading, isDetecting, startDetection, toast]);

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
            {/* Camera view for answering - using live stream */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {liveStream ? (
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