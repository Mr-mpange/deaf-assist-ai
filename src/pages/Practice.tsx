import { useState, useRef, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  CameraOff, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Hand,
  Loader2,
  MessageSquare,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useProgress } from '@/hooks/useProgress';
import { useHandDetection, classifySign } from '@/hooks/useHandDetection';
import { SignToCommunicate } from '@/components/SignToCommunicate';
import { AITutorChat } from '@/components/AITutorChat';
import { DetectionQualityIndicator } from '@/components/DetectionQualityIndicator';
import { classifyWithSmoothing, getDetectionQuality, resetClassifier } from '@/lib/signClassifier';

export default function Practice() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [prediction, setPrediction] = useState<{ sign: string; confidence: number } | null>(null);
  const [signsDetected, setSignsDetected] = useState<{ sign: string; confidence: number }[]>([]);
  const [detectionQuality, setDetectionQuality] = useState<{ quality: 'poor' | 'fair' | 'good' | 'excellent'; tip: string; handVisible: boolean; handCount: number }>({
    quality: 'poor', tip: 'Start camera to begin', handVisible: false, handCount: 0
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { incrementProgress } = useProgress();
  
  const { isLoading: isModelLoading, error: modelError, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permission.state === 'denied') {
          throw new Error('Camera permission permanently denied. Please reset in browser settings.');
        }
      } catch (permError) {
        // Permission query failed (might be normal)
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      
      setIsCameraOn(true);
      streamRef.current = stream;
      resetClassifier();
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
          toast({ title: "Camera Started", description: "Position your hands in the frame" });
        } else {
          setTimeout(() => {
            if (videoRef.current && streamRef.current) {
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play();
            }
          }, 100);
        }
      }, 50);
    } catch (err) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') errorMessage = 'Camera permission denied. Click the camera icon in address bar to allow access.';
        else if (err.name === 'NotFoundError') errorMessage = 'No camera found. Please connect a camera.';
        else if (err.name === 'NotReadableError') errorMessage = 'Camera is being used by another application.';
        else errorMessage = err.message;
      }
      toast({ title: "Camera Error", description: errorMessage, variant: "destructive" });
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
    resetClassifier();
  };

  const startDetection = useCallback(() => {
    if (!isCameraOn || isModelLoading) return;
    setIsDetecting(true);
    setPrediction(null);
    resetClassifier();
    
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

  // Process results when landmarks are detected
  useEffect(() => {
    if (!results?.landmarks || !canvasRef.current) return;
    
    drawLandmarks(canvasRef.current, results.landmarks);
    
    // Update detection quality
    const quality = getDetectionQuality(results.landmarks);
    setDetectionQuality(quality);
    
    // Use smoothed classification for production accuracy
    const smoothed = classifyWithSmoothing(results.landmarks, classifySign);
    if (smoothed && smoothed.sign !== 'DETECTING...') {
      setPrediction(smoothed);
      
      const existingIndex = signsDetected.findIndex(s => s.sign === smoothed.sign);
      if (existingIndex === -1) {
        setSignsDetected(prev => [...prev, { sign: smoothed.sign, confidence: smoothed.confidence }]);
        incrementProgress('signs_learned', 1);
      } else if (smoothed.confidence > signsDetected[existingIndex].confidence) {
        setSignsDetected(prev => prev.map((s, i) => i === existingIndex ? { ...s, confidence: smoothed.confidence } : s));
      }
    }
  }, [results, drawLandmarks, signsDetected, incrementProgress]);

  const resetPractice = async () => {
    setPrediction(null);
    resetClassifier();
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    await incrementProgress('practice_sessions', 1);
    toast({
      title: "Practice Session Complete!",
      description: `You detected ${signsDetected.length} different signs.`,
    });
    setSignsDetected([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            AI Practice Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Production-ready sign detection with AI tutoring, translation, and real-time feedback
          </p>
        </div>

        {modelError && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-destructive">{modelError}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="practice" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="communicate" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communicate
            </TabsTrigger>
            <TabsTrigger value="tutor" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Tutor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="practice" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Camera View */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border/50 shadow-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-foreground/5">
                      {isCameraOn ? (
                        <>
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 w-full h-full pointer-events-none" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <CameraOff className="w-16 h-16 text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">Camera is off</p>
                        </div>
                      )}
                      
                      {/* Detection quality indicator */}
                      {isDetecting && (
                        <div className="absolute top-4 left-4">
                          <DetectionQualityIndicator {...detectionQuality} />
                        </div>
                      )}

                      {isModelLoading && isCameraOn && (
                        <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center backdrop-blur-sm">
                          <div className="text-center text-primary-foreground">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                            <p className="font-medium">Loading hand detection model...</p>
                          </div>
                        </div>
                      )}

                      {/* Current detection with enhanced display */}
                      {prediction && isDetecting && (
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Sparkles className="w-5 h-5 text-primary" />
                              <span className="font-bold text-lg">{prediction.sign}</span>
                            </div>
                            <Badge variant={prediction.confidence >= 0.85 ? "default" : prediction.confidence >= 0.70 ? "secondary" : "outline"}>
                              {Math.round(prediction.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Controls */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant={isCameraOn ? "destructive" : "default"}
                    size="lg"
                    onClick={isCameraOn ? stopCamera : startCamera}
                  >
                    {isCameraOn ? <><CameraOff className="w-5 h-5 mr-2" />Stop Camera</> : <><Camera className="w-5 h-5 mr-2" />Start Camera</>}
                  </Button>
                  
                  <Button
                    variant={isDetecting ? "secondary" : "default"}
                    size="lg"
                    onClick={isDetecting ? stopDetection : startDetection}
                    disabled={!isCameraOn || isModelLoading}
                  >
                    {isDetecting ? <><div className="w-4 h-4 rounded-sm bg-destructive mr-2" />Stop Detection</> : <><Hand className="w-5 h-5 mr-2" />Start Detection</>}
                  </Button>

                  {signsDetected.length > 0 && (
                    <Button variant="outline" size="lg" onClick={resetPractice}>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      End Session ({signsDetected.length} signs)
                    </Button>
                  )}
                </div>
              </div>

              {/* Sidebar with AI Tutor */}
              <div className="space-y-4">
                {/* Signs Detected This Session */}
                {signsDetected.length > 0 && (
                  <Card className="border-border/50 shadow-card animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        Detected ({signsDetected.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {signsDetected.map((s, i) => (
                          <Badge
                            key={i}
                            variant={s.confidence >= 0.85 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {s.sign} {Math.round(s.confidence * 100)}%
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Inline AI Tutor */}
                <AITutorChat
                  detectedSigns={signsDetected}
                  className="h-[500px]"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="communicate" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <SignToCommunicate />
              <Card className="border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">How to Communicate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">1</div>
                    <div>
                      <p className="font-medium">Start Camera</p>
                      <p className="text-sm text-muted-foreground">Enable your camera to begin</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">2</div>
                    <div>
                      <p className="font-medium">Sign Letters</p>
                      <p className="text-sm text-muted-foreground">Hold each letter steady to build words</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">3</div>
                    <div>
                      <p className="font-medium">Speak Out</p>
                      <p className="text-sm text-muted-foreground">Click the speaker icon to vocalize your message</p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-medium mb-2">Supported Signs</h4>
                    <div className="flex flex-wrap gap-1">
                      {['A-Z', '0-10', 'HELLO', 'THANK YOU', 'YES', 'NO', 'PLEASE', 'SORRY', 'HELP', 'OK', 'STOP'].map((sign) => (
                        <Badge key={sign} variant="secondary" className="text-xs">{sign}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tutor" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <AITutorChat className="min-h-[600px]" />
              <div className="space-y-6">
                <Card className="border-border/50 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      What the AI Tutor Can Do
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="font-medium text-sm">🎓 Teach Signs</p>
                        <p className="text-xs text-muted-foreground">Ask "How do I sign FAMILY?" for detailed instructions</p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="font-medium text-sm">📝 Give Feedback</p>
                        <p className="text-xs text-muted-foreground">Practice signs first, then ask for personalized feedback</p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="font-medium text-sm">🌐 Translate</p>
                        <p className="text-xs text-muted-foreground">Switch to Translate mode to convert English sentences to ASL</p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="font-medium text-sm">🤟 Deaf Culture</p>
                        <p className="text-xs text-muted-foreground">Learn about Deaf culture, ASL grammar, and regional differences</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Recognition Coverage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="font-bold text-2xl text-primary">26</p>
                        <p className="text-muted-foreground">Letters (A-Z)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="font-bold text-2xl text-primary">11</p>
                        <p className="text-muted-foreground">Numbers (0-10)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="font-bold text-2xl text-primary">7</p>
                        <p className="text-muted-foreground">Common Phrases</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="font-bold text-2xl text-primary">8</p>
                        <p className="text-muted-foreground">Gestures</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      52+ static signs recognized with temporal smoothing for production-grade accuracy
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
