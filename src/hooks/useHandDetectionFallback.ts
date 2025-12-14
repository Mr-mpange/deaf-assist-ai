import { useRef, useEffect, useCallback, useState } from 'react';
import { HandLandmark, HandResults, SignPrediction } from './useHandDetection';

// Fallback hook that provides mock data when MediaPipe fails
export function useHandDetectionFallback(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>('Hand detection temporarily unavailable. Check console for details.');
  const [results, setResults] = useState<HandResults | null>(null);

  const detectHands = useCallback(async () => {
    // Mock detection - just return empty results
    setResults({ landmarks: null, handedness: null });
  }, []);

  const drawLandmarks = useCallback((canvas: HTMLCanvasElement, landmarks: HandLandmark[][]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a simple message
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Hand detection unavailable', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Check console for errors', canvas.width / 2, canvas.height / 2 + 25);
  }, []);

  return {
    isLoading,
    error,
    results,
    detectHands,
    drawLandmarks,
  };
}