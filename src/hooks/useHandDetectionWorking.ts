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

// Working MediaPipe approach using dynamic script loading
export function useHandDetectionWorking(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HandResults | null>(null);
  const handsRef = useRef<any>(null);

  const loadMediaPipeScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if MediaPipe is already loaded
      if ((window as any).Hands) {
        resolve((window as any).Hands);
        return;
      }

      // Load MediaPipe script dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.onload = () => {
        if ((window as any).Hands) {
          resolve((window as any).Hands);
        } else {
          reject(new Error('MediaPipe Hands not found after script load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load MediaPipe script'));
      document.head.appendChild(script);
    });
  }, []);

  const initializeHands = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 Loading MediaPipe via script tag...');

      const Hands = await loadMediaPipeScript();
      console.log('✅ MediaPipe script loaded successfully');

      const hands = new (Hands as any)({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((handResults: any) => {
        setResults({
          landmarks: handResults.multiHandLandmarks || null,
          handedness: handResults.multiHandedness || null,
        });
      });

      await hands.initialize();
      handsRef.current = hands;
      setIsLoading(false);
      console.log('🎉 MediaPipe initialized successfully!');
    } catch (err) {
      console.error('💥 MediaPipe initialization failed:', err);
      setError(`MediaPipe failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [loadMediaPipeScript]);

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
    
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    landmarks.forEach((hand) => {
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 3;
      
      connections.forEach(([start, end]) => {
        const startPoint = hand[start];
        const endPoint = hand[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });

      hand.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, index === 0 ? 10 : 6, 0, 2 * Math.PI);
        ctx.fillStyle = index === 0 ? 'hsl(var(--secondary))' : 'hsl(var(--primary))';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
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