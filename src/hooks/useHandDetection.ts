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

export interface SignPrediction {
  sign: string;
  confidence: number;
  category?: string;
}

export function useHandDetection(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HandResults | null>(null);
  const handsRef = useRef<any>(null);

  const initializeHands = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { Hands } = await import('@mediapipe/hands');
      
      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
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

// Enhanced sign classification with ASL alphabet and common signs
export function classifySign(landmarks: HandLandmark[][]): SignPrediction | null {
  if (!landmarks || landmarks.length === 0) return null;

  const hand = landmarks[0];
  if (!hand || hand.length < 21) return null;

  // Finger landmarks
  const wrist = hand[0];
  const thumbCMC = hand[1], thumbMCP = hand[2], thumbIP = hand[3], thumbTip = hand[4];
  const indexMCP = hand[5], indexPIP = hand[6], indexDIP = hand[7], indexTip = hand[8];
  const middleMCP = hand[9], middlePIP = hand[10], middleDIP = hand[11], middleTip = hand[12];
  const ringMCP = hand[13], ringPIP = hand[14], ringDIP = hand[15], ringTip = hand[16];
  const pinkyMCP = hand[17], pinkyPIP = hand[18], pinkyDIP = hand[19], pinkyTip = hand[20];

  // Helper functions
  const distance = (a: HandLandmark, b: HandLandmark) => 
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const isFingerExtended = (tip: HandLandmark, pip: HandLandmark, mcp: HandLandmark) => 
    tip.y < pip.y - 0.03 && pip.y < mcp.y;

  const isFingerCurled = (tip: HandLandmark, pip: HandLandmark, mcp: HandLandmark) =>
    tip.y > pip.y && distance(tip, mcp) < distance(pip, mcp);

  const isThumbExtended = () => {
    const thumbDist = distance(thumbTip, indexMCP);
    return thumbDist > 0.12;
  };

  const isThumbAcrossPalm = () => {
    return thumbTip.x > indexMCP.x - 0.02 && thumbTip.x < ringMCP.x + 0.02;
  };

  // Finger states
  const indexExtended = isFingerExtended(indexTip, indexPIP, indexMCP);
  const middleExtended = isFingerExtended(middleTip, middlePIP, middleMCP);
  const ringExtended = isFingerExtended(ringTip, ringPIP, ringMCP);
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyPIP, pinkyMCP);
  const thumbExtended = isThumbExtended();
  
  const indexCurled = isFingerCurled(indexTip, indexPIP, indexMCP);
  const middleCurled = isFingerCurled(middleTip, middlePIP, middleMCP);
  const ringCurled = isFingerCurled(ringTip, ringPIP, ringMCP);
  const pinkyCurled = isFingerCurled(pinkyTip, pinkyPIP, pinkyMCP);

  // Hand orientation (palm facing camera or away)
  const palmUp = wrist.y > middleMCP.y;
  const handRaised = wrist.y > 0.4; // Hand in upper portion of frame

  // === ASL ALPHABET DETECTION ===

  // A - Fist with thumb to side
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbExtended) {
    const thumbBeside = thumbTip.x < indexMCP.x - 0.05;
    if (thumbBeside) {
      return { sign: 'A', confidence: 0.88, category: 'alphabet' };
    }
  }

  // B - Flat hand, fingers up, thumb across palm
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    if (isThumbAcrossPalm()) {
      return { sign: 'B', confidence: 0.85, category: 'alphabet' };
    }
  }

  // C - Curved hand like holding a cup
  const fingersTogether = 
    distance(indexTip, middleTip) < 0.08 &&
    distance(middleTip, ringTip) < 0.08 &&
    distance(ringTip, pinkyTip) < 0.08;
  
  if (!indexCurled && !middleCurled && fingersTogether && distance(thumbTip, indexTip) > 0.1) {
    return { sign: 'C', confidence: 0.82, category: 'alphabet' };
  }

  // D - Index up, other fingers touch thumb
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const othersNearThumb = 
      distance(middleTip, thumbTip) < 0.08 &&
      distance(ringTip, thumbTip) < 0.1;
    if (othersNearThumb) {
      return { sign: 'D', confidence: 0.84, category: 'alphabet' };
    }
  }

  // E - All fingers curled, thumb across
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
    return { sign: 'E', confidence: 0.80, category: 'alphabet' };
  }

  // F - OK sign variant (index and thumb touch, others extended)
  if (distance(indexTip, thumbTip) < 0.06 && middleExtended && ringExtended && pinkyExtended) {
    return { sign: 'F', confidence: 0.85, category: 'alphabet' };
  }

  // I - Pinky extended only
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
    return { sign: 'I', confidence: 0.88, category: 'alphabet' };
  }

  // K - Index and middle extended spread, thumb between
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const spread = distance(indexTip, middleTip) > 0.08;
    if (spread) {
      return { sign: 'K', confidence: 0.82, category: 'alphabet' };
    }
  }

  // L - L shape (index and thumb extended at angle)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
    const angle = Math.abs(thumbTip.x - indexTip.x) > 0.1;
    if (angle) {
      return { sign: 'L', confidence: 0.87, category: 'alphabet' };
    }
  }

  // O - All fingers form circle with thumb
  if (fingersTogether && distance(indexTip, thumbTip) < 0.08) {
    return { sign: 'O', confidence: 0.83, category: 'alphabet' };
  }

  // U - Index and middle extended together
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const together = distance(indexTip, middleTip) < 0.06;
    if (together) {
      return { sign: 'U', confidence: 0.85, category: 'alphabet' };
    }
  }

  // V / Peace / 2
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const spread = distance(indexTip, middleTip) > 0.06;
    if (spread) {
      return { sign: 'V / PEACE / TWO', confidence: 0.90, category: 'number' };
    }
  }

  // W - Three fingers extended spread
  if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
    return { sign: 'W / THREE', confidence: 0.85, category: 'alphabet' };
  }

  // Y - Thumb and pinky extended (hang loose)
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && thumbExtended) {
    return { sign: 'Y', confidence: 0.88, category: 'alphabet' };
  }

  // === COMMON SIGNS & GESTURES ===

  // RAISE HAND - Open palm up high
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && handRaised) {
    return { sign: 'RAISE HAND', confidence: 0.92, category: 'gesture' };
  }

  // THUMBS UP
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
    if (thumbTip.y < thumbMCP.y) {
      return { sign: 'THUMBS UP / GOOD', confidence: 0.92, category: 'gesture' };
    }
  }

  // THUMBS DOWN
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
    if (thumbTip.y > thumbMCP.y) {
      return { sign: 'THUMBS DOWN', confidence: 0.88, category: 'gesture' };
    }
  }

  // OPEN HAND / 5 / STOP
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
    return { sign: 'FIVE / STOP / HELLO', confidence: 0.90, category: 'number' };
  }

  // FIST / ZERO
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return { sign: 'FIST / ZERO', confidence: 0.92, category: 'number' };
  }

  // ONE / POINTING
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return { sign: 'ONE / POINT', confidence: 0.90, category: 'number' };
  }

  // FOUR
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
    return { sign: 'FOUR', confidence: 0.87, category: 'number' };
  }

  // OK sign
  if (distance(indexTip, thumbTip) < 0.05 && middleExtended && ringExtended && pinkyExtended) {
    return { sign: 'OK', confidence: 0.88, category: 'gesture' };
  }

  // ROCK ON / HORNS
  if (indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
    return { sign: 'ROCK ON', confidence: 0.85, category: 'gesture' };
  }

  // CALL ME (thumb and pinky extended)
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && thumbExtended) {
    return { sign: 'CALL ME / Y', confidence: 0.85, category: 'gesture' };
  }

  return { sign: 'DETECTING...', confidence: 0.3, category: 'unknown' };
}

// Check specifically for raised hand gesture
export function isRaisedHand(landmarks: HandLandmark[][]): boolean {
  if (!landmarks || landmarks.length === 0) return false;
  
  const prediction = classifySign(landmarks);
  return prediction?.sign === 'RAISE HAND' || prediction?.sign === 'FIVE / STOP / HELLO';
}