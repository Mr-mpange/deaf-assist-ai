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
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useProgress } from '@/hooks/useProgress';
import { useHandDetection, classifySign } from '@/hooks/useHandDetection';
import { SignToCommunicate } from '@/components/SignToCommunicate';

export default function Practice() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [prediction, setPrediction] = useState<{ sign: string; confidence: number } | null>(null);
  const [signsDetected, setSignsDetected] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { incrementProgress } = useProgress();
  
  const { isLoading: isModelLoading, error: modelError, results, detectHands, drawLandmarks } = useHandDetection(videoRef);

  const startCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...');
      
      // Check if camera is available first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      // Check current permissions
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('📋 Current camera permission:', permission.state);
        
        if (permission.state === 'denied') {
          throw new Error('Camera permission permanently denied. Please reset in browser settings.');
        }
      } catch (permError) {
        console.log('⚠️ Permission query failed (might be normal):', permError);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      
      console.log('✅ Camera stream obtained:', stream);
      
      // Set camera state first to render video element
      setIsCameraOn(true);
      streamRef.current = stream;
      
      // Wait a bit for React to render the video element
      setTimeout(() => {
        if (videoRef.current) {
          console.log('📹 Setting video source...');
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('🎬 Video metadata loaded, starting playback...');
            videoRef.current?.play().then(() => {
              console.log('▶️ Video playing successfully');
            }).catch(playError => {
              console.error('❌ Video play failed:', playError);
            });
          };
          
          console.log('✅ Camera setup complete');
          
          toast({
            title: "Camera Started",
            description: "Position your hands in the frame",
          });
        } else {
          console.error('❌ Video ref still null after timeout');
          // Fallback: try again after another short delay
          setTimeout(() => {
            if (videoRef.current && streamRef.current) {
              console.log('🔄 Retrying video setup...');
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play();
            }
          }, 100);
        }
      }, 50);
    } catch (err) {
      console.error('💥 Camera start failed:', err);
      
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Click the camera icon in address bar to allow access.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is being used by another application.';
        } else {
          errorMessage = err.message;
        }
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

  const startDetection = useCallback(() => {
    if (!isCameraOn || isModelLoading) return;
    
    setIsDetecting(true);
    setPrediction(null);
    
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
    
    // Draw landmarks on canvas
    drawLandmarks(canvasRef.current, results.landmarks);
    
    // Classify the sign
    const classified = classifySign(results.landmarks);
    if (classified && classified.sign !== 'UNKNOWN') {
      setPrediction(classified);
      
      // Track unique signs
      if (!signsDetected.includes(classified.sign)) {
        setSignsDetected(prev => [...prev, classified.sign]);
        incrementProgress('signs_learned', 1);
      }
    }
  }, [results, drawLandmarks, signsDetected, incrementProgress]);

  const resetPractice = async () => {
    setPrediction(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    // Increment practice session
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
            Practice Mode
          </h1>
          <p className="text-muted-foreground mt-1">
            Practice sign language with AI-powered hand detection and communicate using signs
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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              Practice Signs
            </TabsTrigger>
            <TabsTrigger value="communicate" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communicate
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
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <CameraOff className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Camera is off</p>
                    </div>
                  )}
                  
                  {/* Detection indicator */}
                  {isDetecting && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-primary/90 text-primary-foreground rounded-full">
                      <Hand className="w-4 h-4" />
                      <span className="text-sm font-medium">Detecting...</span>
                    </div>
                  )}

                  {/* Model loading indicator */}
                  {isModelLoading && isCameraOn && (
                    <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center text-primary-foreground">
                        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                        <p className="font-medium">Loading hand detection model...</p>
                      </div>
                    </div>
                  )}

                  {/* Current detection */}
                  {prediction && isDetecting && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-background/90 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <span className="font-semibold">{prediction.sign}</span>
                        </div>
                        <Badge variant={prediction.confidence >= 0.85 ? "default" : "secondary"}>
                          {Math.round(prediction.confidence * 100)}% confidence
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
                variant={isCameraOn ? "destructive" : "gradient"}
                size="lg"
                onClick={isCameraOn ? stopCamera : startCamera}
              >
                {isCameraOn ? (
                  <>
                    <CameraOff className="w-5 h-5 mr-2" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
              
              <Button
                variant={isDetecting ? "secondary" : "default"}
                size="lg"
                onClick={isDetecting ? stopDetection : startDetection}
                disabled={!isCameraOn || isModelLoading}
              >
                {isDetecting ? (
                  <>
                    <div className="w-4 h-4 rounded-sm bg-destructive mr-2" />
                    Stop Detection
                  </>
                ) : (
                  <>
                    <Hand className="w-5 h-5 mr-2" />
                    Start Detection
                  </>
                )}
              </Button>

              {signsDetected.length > 0 && (
                <Button variant="outline" size="lg" onClick={resetPractice}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Signs Detected This Session */}
            {signsDetected.length > 0 && (
              <Card className="border-border/50 shadow-card animate-scale-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Signs Detected ({signsDetected.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {signsDetected.map((sign, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10">
                        {sign}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card className="border-border/50 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">How to Practice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Start Camera</p>
                    <p className="text-sm text-muted-foreground">Position yourself with good lighting</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Start Detection</p>
                    <p className="text-sm text-muted-foreground">AI will track your hand movements</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Make Signs</p>
                    <p className="text-sm text-muted-foreground">Get real-time feedback on your signs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-secondary/50 bg-secondary/5 shadow-card">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  Pro Tips
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ensure good lighting on your hands</li>
                  <li>• Use a plain background when possible</li>
                  <li>• Keep your hands fully in the frame</li>
                  <li>• Move slowly for better detection</li>
                </ul>
              </CardContent>
            </Card>
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
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Start Camera</p>
                      <p className="text-sm text-muted-foreground">Enable your camera to begin</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Sign Letters</p>
                      <p className="text-sm text-muted-foreground">Hold each letter steady to build words</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Speak Out</p>
                      <p className="text-sm text-muted-foreground">Click the speaker icon to vocalize your message</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-medium mb-2">Supported Signs</h4>
                    <div className="flex flex-wrap gap-1">
                      {['A-Z', 'Numbers 0-10', 'HELLO', 'THANK YOU', 'YES', 'NO', 'PLEASE', 'SORRY', 'HELP'].map((sign) => (
                        <Badge key={sign} variant="secondary" className="text-xs">
                          {sign}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
