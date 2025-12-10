import { useRef, useEffect, useCallback, useState } from 'react';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResults {
  landmarks: HandLandmark[][] | null;
  handedness: { label: string; score: number }[] | null;
}

export function useHandDetection(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HandResults | null>(null);
  const handsRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initializeHands = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Dynamically import MediaPipe to avoid SSR issues
      const { Hands } = await import('@mediapipe/hands');
      
      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((handResults: any) => {
        setResults({
          landmarks: handResults.multiHandLandmarks || null,
          handedness: handResults.multiHandedness || null,
        });
      });

      handsRef.current = hands;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize hand detection:', err);
      setError('Failed to load hand detection model');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeHands();
    
    return () => {
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [initializeHands]);

  const detectHands = useCallback(async () => {
    if (!handsRef.current || !videoRef.current) return;
    
    const video = videoRef.current;
    if (video.readyState < 2) return;

    try {
      await handsRef.current.send({ image: video });
    } catch (err) {
      console.error('Hand detection error:', err);
    }
  }, [videoRef]);

  const drawLandmarks = useCallback((canvas: HTMLCanvasElement, landmarks: HandLandmark[][]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Hand connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm
    ];

    landmarks.forEach((hand) => {
      // Draw connections
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      
      connections.forEach(([start, end]) => {
        const startPoint = hand[start];
        const endPoint = hand[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });

      // Draw landmarks
      hand.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, index === 0 ? 8 : 5, 0, 2 * Math.PI);
        ctx.fillStyle = index === 0 ? 'hsl(var(--secondary))' : 'hsl(var(--primary))';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });
  }, []);

  return {
    isLoading,
    error,
    results,
    detectHands,
    drawLandmarks,
  };
}

// Simple sign classification based on hand landmarks
export function classifySign(landmarks: HandLandmark[][]): { sign: string; confidence: number } | null {
  if (!landmarks || landmarks.length === 0) return null;

  const hand = landmarks[0];
  if (!hand || hand.length < 21) return null;

  // Get finger tip and base positions
  const thumbTip = hand[4];
  const indexTip = hand[8];
  const middleTip = hand[12];
  const ringTip = hand[16];
  const pinkyTip = hand[20];
  
  const indexBase = hand[5];
  const middleBase = hand[9];
  const ringBase = hand[13];
  const pinkyBase = hand[17];
  const wrist = hand[0];

  // Calculate if fingers are extended
  const isIndexExtended = indexTip.y < indexBase.y - 0.05;
  const isMiddleExtended = middleTip.y < middleBase.y - 0.05;
  const isRingExtended = ringTip.y < ringBase.y - 0.05;
  const isPinkyExtended = pinkyTip.y < pinkyBase.y - 0.05;
  const isThumbExtended = Math.abs(thumbTip.x - wrist.x) > 0.1;

  // Simple pattern matching for common signs
  if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return { sign: 'PEACE / V', confidence: 0.85 };
  }
  
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && isThumbExtended) {
    return { sign: 'THUMBS UP', confidence: 0.9 };
  }
  
  if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbExtended) {
    return { sign: 'OPEN HAND / FIVE', confidence: 0.88 };
  }
  
  if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && !isThumbExtended) {
    return { sign: 'FIST', confidence: 0.92 };
  }
  
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
    return { sign: 'POINTING / ONE', confidence: 0.87 };
  }

  if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
    return { sign: 'THREE', confidence: 0.82 };
  }

  return { sign: 'UNKNOWN', confidence: 0.5 };
}
