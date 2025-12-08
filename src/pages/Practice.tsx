import { useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  Upload, 
  Play, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function Practice() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [prediction, setPrediction] = useState<{ sign: string; confidence: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOn(true);
      }
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (!isCameraOn) {
      toast({
        title: "Camera Required",
        description: "Please start the camera first",
        variant: "destructive",
      });
      return;
    }
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      // Simulate AI analysis after 3 seconds
      setTimeout(() => {
        simulateAIAnalysis();
      }, 3000);
    }
  };

  const simulateAIAnalysis = () => {
    setIsRecording(false);
    setIsAnalyzing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const mockPredictions = [
        { sign: 'HELLO', confidence: 0.92 },
        { sign: 'THANK YOU', confidence: 0.88 },
        { sign: 'GOODBYE', confidence: 0.95 },
        { sign: 'PLEASE', confidence: 0.85 },
        { sign: 'YES', confidence: 0.97 },
      ];
      
      const randomPrediction = mockPredictions[Math.floor(Math.random() * mockPredictions.length)];
      setPrediction(randomPrediction);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Complete",
        description: `Detected: ${randomPrediction.sign} (${Math.round(randomPrediction.confidence * 100)}% confidence)`,
      });
    }, 2000);
  };

  const resetPractice = () => {
    setPrediction(null);
    setIsRecording(false);
    setIsAnalyzing(false);
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
            Practice sign language with AI-powered feedback
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera View */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/50 shadow-card overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-foreground/5">
                  {isCameraOn ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <CameraOff className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Camera is off</p>
                    </div>
                  )}
                  
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-destructive/90 text-destructive-foreground rounded-full animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-destructive-foreground" />
                      <span className="text-sm font-medium">Recording...</span>
                    </div>
                  )}

                  {/* Analyzing overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center text-primary-foreground">
                        <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
                        <p className="font-medium">Analyzing your sign...</p>
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
                variant={isRecording ? "secondary" : "default"}
                size="lg"
                onClick={toggleRecording}
                disabled={!isCameraOn || isAnalyzing}
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 rounded-sm bg-destructive mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>

              {prediction && (
                <Button variant="outline" size="lg" onClick={resetPractice}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Result */}
            {prediction && (
              <Card className="border-border/50 shadow-card animate-scale-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Detection Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-gradient-primary rounded-xl">
                    <p className="text-sm text-primary-foreground/80 mb-1">Detected Sign</p>
                    <p className="text-3xl font-bold text-primary-foreground">{prediction.sign}</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className={cn(
                        "font-medium",
                        prediction.confidence >= 0.9 ? "text-success" : 
                        prediction.confidence >= 0.7 ? "text-warning" : "text-destructive"
                      )}>
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          prediction.confidence >= 0.9 ? "bg-success" : 
                          prediction.confidence >= 0.7 ? "bg-warning" : "bg-destructive"
                        )}
                        style={{ width: `${prediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    {prediction.confidence >= 0.85 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <span className="text-sm">Great job! Your sign was clear.</span>
                      </>
                    ) : (
                      <>
                        <Info className="w-5 h-5 text-warning" />
                        <span className="text-sm">Try to make your movements more distinct.</span>
                      </>
                    )}
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
                    <p className="text-sm text-muted-foreground">Position yourself in frame with good lighting</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Record Your Sign</p>
                    <p className="text-sm text-muted-foreground">Perform the sign clearly and at a steady pace</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Get AI Feedback</p>
                    <p className="text-sm text-muted-foreground">Review your results and keep practicing!</p>
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
                  <li>• Ensure good lighting on your hands and face</li>
                  <li>• Use a plain background when possible</li>
                  <li>• Keep your hands in the camera frame</li>
                  <li>• Practice each sign multiple times</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
