import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hand, Camera, CameraOff } from 'lucide-react';
import { useHandDetectionWorking } from '@/hooks/useHandDetectionWorking';
import { classifySign } from '@/hooks/useHandDetection';

interface PollSignDetectionProps {
  pollOptions: { id: string; text: string }[];
  onSignDetected: (optionId: string) => void;
  disabled?: boolean;
}

// Map common signs to poll option letters
const SIGN_TO_OPTION: Record<string, string> = {
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D',
  'ONE': 'A', 'TWO': 'B', 'THREE': 'C', 'FOUR': 'D',
  'THUMBS UP': 'A', // First option as confirmation
};

export function PollSignDetection({ pollOptions, onSignDetected, disabled }: PollSignDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [detectedSign, setDetectedSign] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [matchedOption, setMatchedOption] = useState<string | null>(null);
  const [confirmTimer, setConfirmTimer] = useState<number>(0);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { results, detectHands } = useHandDetectionWorking(
    isActive ? videoRef : { current: null }
  );

  // Run detection loop
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => detectHands(), 500);
    return () => clearInterval(interval);
  }, [isActive, detectHands]);

  // Classify results into sign
  const prediction = results?.landmarks ? classifySign(results.landmarks) : null;
  const currentSign = prediction?.sign || null;
  const detectionConfidence = prediction?.confidence || 0;

  // Start camera
  const startDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);

  // Stop camera
  const stopDetection = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setDetectedSign(null);
    setMatchedOption(null);
    setConfirmTimer(0);
    if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
  }, []);

  // Map detected sign to poll option
  useEffect(() => {
    if (!currentSign || currentSign === 'DETECTING...' || disabled) {
      setDetectedSign(null);
      setMatchedOption(null);
      setConfirmTimer(0);
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
      return;
    }

    setDetectedSign(currentSign);
    setConfidence(detectionConfidence);

    const mapped = SIGN_TO_OPTION[currentSign];
    if (mapped && pollOptions.some(o => o.id === mapped) && detectionConfidence > 0.7) {
      if (matchedOption !== mapped) {
        setMatchedOption(mapped);
        setConfirmTimer(0);
        if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);

        // Start 2-second hold confirmation
        let elapsed = 0;
        confirmTimerRef.current = setInterval(() => {
          elapsed += 100;
          setConfirmTimer(elapsed);
          if (elapsed >= 2000) {
            clearInterval(confirmTimerRef.current!);
            onSignDetected(mapped);
            setConfirmTimer(0);
            setMatchedOption(null);
          }
        }, 100);
      }
    } else {
      setMatchedOption(null);
      setConfirmTimer(0);
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
    }
  }, [currentSign, detectionConfidence, pollOptions, disabled, onSignDetected, matchedOption]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  if (disabled) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Hand className="w-4 h-4 text-primary" />
          Sign Your Answer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isActive ? (
          <Button onClick={startDetection} variant="outline" size="sm" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Use Sign Language to Vote
          </Button>
        ) : (
          <>
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
                playsInline
                muted
              />
              {matchedOption && (
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Selecting option <strong>{matchedOption}</strong></span>
                      <span>{Math.round(confirmTimer / 20)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(confirmTimer / 2000) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {detectedSign ? (
                  <span>Detected: <Badge variant="outline" className="text-xs">{detectedSign}</Badge></span>
                ) : (
                  <span>Show sign A, B, C, or D</span>
                )}
              </div>
              <Button onClick={stopDetection} variant="ghost" size="sm">
                <CameraOff className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Hold the sign for 2 seconds to confirm your vote
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
