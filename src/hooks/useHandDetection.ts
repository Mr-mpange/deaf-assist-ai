import { useRef, useEffect, useCallback, useState } from 'react';
import { useHandDetectionFallback } from './useHandDetectionFallback';
import { useHandDetectionWorking } from './useHandDetectionWorking';

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
  // Try the working version first
  const workingDetection = useHandDetectionWorking(videoRef);
  const fallback = useHandDetectionFallback(videoRef);
  
  // If working detection has an error, use fallback
  if (workingDetection.error) {
    console.log('Working detection failed, using fallback:', workingDetection.error);
    return fallback;
  }
  
  return workingDetection;


}

// Full ASL Alphabet and Common Signs Classification
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
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

  const distance2D = (a: HandLandmark, b: HandLandmark) => 
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const isFingerExtended = (tip: HandLandmark, pip: HandLandmark, mcp: HandLandmark) => 
    tip.y < pip.y - 0.02 && pip.y < mcp.y + 0.02;

  const isFingerCurled = (tip: HandLandmark, pip: HandLandmark, mcp: HandLandmark) =>
    tip.y > pip.y - 0.02 && distance(tip, mcp) < distance(pip, mcp) * 1.2;

  const isFingerHalfCurled = (tip: HandLandmark, pip: HandLandmark, dip: HandLandmark) =>
    Math.abs(tip.y - pip.y) < 0.05 && tip.y > dip.y - 0.03;

  const isThumbExtended = () => {
    const thumbDist = distance2D(thumbTip, indexMCP);
    return thumbDist > 0.1;
  };

  const isThumbAcrossPalm = () => {
    return thumbTip.x > indexMCP.x - 0.03 && thumbTip.x < ringMCP.x + 0.03;
  };

  const isThumbUp = () => thumbTip.y < thumbMCP.y - 0.05;
  const isThumbDown = () => thumbTip.y > thumbMCP.y + 0.05;

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

  const indexHalfCurled = isFingerHalfCurled(indexTip, indexPIP, indexDIP);
  const middleHalfCurled = isFingerHalfCurled(middleTip, middlePIP, middleDIP);
  const ringHalfCurled = isFingerHalfCurled(ringTip, ringPIP, ringDIP);
  const pinkyHalfCurled = isFingerHalfCurled(pinkyTip, pinkyPIP, pinkyDIP);

  // Hand position
  const handRaised = wrist.y > 0.35;
  const palmFacingCamera = wrist.z < middleMCP.z;

  // Fingers touching
  const fingersTogether = 
    distance2D(indexTip, middleTip) < 0.06 &&
    distance2D(middleTip, ringTip) < 0.06 &&
    distance2D(ringTip, pinkyTip) < 0.06;

  const indexMiddleTogether = distance2D(indexTip, middleTip) < 0.05;
  const middleRingTogether = distance2D(middleTip, ringTip) < 0.05;

  // ==================== ASL ALPHABET ====================

  // A - Fist with thumb to side
  if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
    const thumbBeside = thumbTip.x < indexMCP.x - 0.04 || thumbTip.x > pinkyMCP.x + 0.04;
    if (thumbBeside && thumbTip.y < indexPIP.y) {
      return { sign: 'A', confidence: 0.88, category: 'alphabet' };
    }
  }

  // B - Flat hand, fingers up, thumb across palm
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && fingersTogether) {
    if (isThumbAcrossPalm() || thumbTip.y > indexMCP.y) {
      return { sign: 'B', confidence: 0.87, category: 'alphabet' };
    }
  }

  // C - Curved hand like holding a cup
  if (indexHalfCurled && middleHalfCurled && ringHalfCurled && pinkyHalfCurled) {
    const curved = distance2D(thumbTip, indexTip) > 0.08 && distance2D(thumbTip, indexTip) < 0.2;
    if (curved) {
      return { sign: 'C', confidence: 0.82, category: 'alphabet' };
    }
  }

  // D - Index up, other fingers touch thumb
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const othersNearThumb = distance2D(middleTip, thumbTip) < 0.07;
    if (othersNearThumb) {
      return { sign: 'D', confidence: 0.85, category: 'alphabet' };
    }
  }

  // E - All fingers curled, tips near palm
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
    const tipsNearPalm = indexTip.y > indexPIP.y && middleTip.y > middlePIP.y;
    if (tipsNearPalm) {
      return { sign: 'E', confidence: 0.80, category: 'alphabet' };
    }
  }

  // F - OK sign variant (thumb and index touch, others extended)
  if (distance2D(indexTip, thumbTip) < 0.05 && middleExtended && ringExtended && pinkyExtended) {
    return { sign: 'F', confidence: 0.86, category: 'alphabet' };
  }

  // G - Index pointing sideways, thumb parallel
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const indexHorizontal = Math.abs(indexTip.y - indexMCP.y) < 0.08;
    const thumbHorizontal = Math.abs(thumbTip.y - thumbMCP.y) < 0.06;
    if (indexHorizontal && thumbHorizontal && Math.abs(indexTip.x - wrist.x) > 0.1) {
      return { sign: 'G', confidence: 0.82, category: 'alphabet' };
    }
  }

  // H - Index and middle extended horizontally
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const horizontal = Math.abs(indexTip.y - indexMCP.y) < 0.08 && Math.abs(middleTip.y - middleMCP.y) < 0.08;
    if (horizontal) {
      return { sign: 'H', confidence: 0.83, category: 'alphabet' };
    }
  }

  // I - Pinky extended only
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && !thumbExtended) {
    return { sign: 'I', confidence: 0.90, category: 'alphabet' };
  }

  // J - I with downward motion (detected as I for static)
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
    if (pinkyTip.x < pinkyMCP.x - 0.05) {
      return { sign: 'J', confidence: 0.75, category: 'alphabet' };
    }
  }

  // K - Index and middle extended spread, thumb between
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const spread = distance2D(indexTip, middleTip) > 0.07;
    const thumbBetween = thumbTip.y < middleMCP.y && thumbTip.x > indexMCP.x;
    if (spread && thumbBetween) {
      return { sign: 'K', confidence: 0.84, category: 'alphabet' };
    }
  }

  // L - L shape (index and thumb extended at right angle)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
    const rightAngle = Math.abs(indexTip.x - indexMCP.x) < 0.05 && Math.abs(thumbTip.y - thumbMCP.y) < 0.05;
    if (rightAngle || distance2D(thumbTip, indexTip) > 0.12) {
      return { sign: 'L', confidence: 0.88, category: 'alphabet' };
    }
  }

  // M - Three fingers over thumb in fist
  if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
    const thumbUnder = thumbTip.y > indexPIP.y && thumbTip.x > indexMCP.x;
    if (thumbUnder && distance2D(ringTip, thumbTip) < 0.08) {
      return { sign: 'M', confidence: 0.78, category: 'alphabet' };
    }
  }

  // N - Two fingers over thumb in fist
  if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
    const thumbUnder = thumbTip.y > indexPIP.y;
    if (thumbUnder && distance2D(middleTip, thumbTip) < 0.08 && distance2D(ringTip, thumbTip) > 0.08) {
      return { sign: 'N', confidence: 0.77, category: 'alphabet' };
    }
  }

  // O - All fingers form circle with thumb
  if (fingersTogether && distance2D(indexTip, thumbTip) < 0.06 && !indexExtended) {
    return { sign: 'O', confidence: 0.85, category: 'alphabet' };
  }

  // P - K pointing down
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const pointingDown = indexTip.y > indexMCP.y && middleTip.y > middleMCP.y;
    if (pointingDown) {
      return { sign: 'P', confidence: 0.80, category: 'alphabet' };
    }
  }

  // Q - G pointing down
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const pointingDown = indexTip.y > wrist.y;
    if (pointingDown && thumbExtended) {
      return { sign: 'Q', confidence: 0.78, category: 'alphabet' };
    }
  }

  // R - Index and middle crossed
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const crossed = indexTip.x > middleTip.x && indexMCP.x < middleMCP.x;
    if (crossed || distance2D(indexTip, middleTip) < 0.03) {
      return { sign: 'R', confidence: 0.82, category: 'alphabet' };
    }
  }

  // S - Fist with thumb over fingers
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
    const thumbOver = thumbTip.y < indexPIP.y && thumbTip.x > indexMCP.x;
    if (thumbOver) {
      return { sign: 'S', confidence: 0.83, category: 'alphabet' };
    }
  }

  // T - Fist with thumb between index and middle
  if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
    const thumbBetween = thumbTip.x > indexMCP.x && thumbTip.x < middleMCP.x;
    if (thumbBetween && thumbTip.y < indexPIP.y) {
      return { sign: 'T', confidence: 0.79, category: 'alphabet' };
    }
  }

  // U - Index and middle extended together
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const together = distance2D(indexTip, middleTip) < 0.05 && indexMiddleTogether;
    if (together) {
      return { sign: 'U', confidence: 0.86, category: 'alphabet' };
    }
  }

  // V / Peace / 2 - Index and middle spread
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const spread = distance2D(indexTip, middleTip) > 0.06;
    if (spread) {
      return { sign: 'V', confidence: 0.90, category: 'alphabet' };
    }
  }

  // W - Three fingers extended spread
  if (indexExtended && middleExtended && ringExtended && !pinkyExtended) {
    const spread = distance2D(indexTip, middleTip) > 0.04 && distance2D(middleTip, ringTip) > 0.04;
    if (spread) {
      return { sign: 'W', confidence: 0.87, category: 'alphabet' };
    }
  }

  // X - Index bent at knuckle (hook shape)
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const indexHooked = indexTip.y > indexDIP.y && indexDIP.y < indexPIP.y;
    if (indexHooked && !thumbExtended) {
      return { sign: 'X', confidence: 0.80, category: 'alphabet' };
    }
  }

  // Y - Thumb and pinky extended (hang loose)
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && thumbExtended) {
    return { sign: 'Y', confidence: 0.90, category: 'alphabet' };
  }

  // Z - Index drawing Z in air (detected as pointing for static)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return { sign: 'Z (pointing)', confidence: 0.75, category: 'alphabet' };
  }

  // ==================== COMMON PHRASES ====================

  // HELLO / WAVE - Open palm, fingers spread
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
    if (palmFacingCamera) {
      return { sign: 'HELLO', confidence: 0.92, category: 'phrase' };
    }
  }

  // THANK YOU - Flat hand from chin outward (static: flat hand)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && fingersTogether) {
    if (wrist.y < 0.5 && !thumbExtended) {
      return { sign: 'THANK YOU', confidence: 0.80, category: 'phrase' };
    }
  }

  // PLEASE - Circular motion on chest (static: flat hand on chest area)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && fingersTogether) {
    if (wrist.y > 0.4 && wrist.y < 0.7) {
      return { sign: 'PLEASE', confidence: 0.78, category: 'phrase' };
    }
  }

  // YES - Fist nodding (static: fist)
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
    return { sign: 'YES', confidence: 0.75, category: 'phrase' };
  }

  // NO - Index and middle together snapping to thumb
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    if (distance2D(indexTip, thumbTip) < 0.06 && distance2D(middleTip, thumbTip) < 0.06) {
      return { sign: 'NO', confidence: 0.80, category: 'phrase' };
    }
  }

  // SORRY - Fist circling on chest (static: fist)
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && thumbExtended) {
    if (wrist.y > 0.3 && wrist.y < 0.6) {
      return { sign: 'SORRY', confidence: 0.75, category: 'phrase' };
    }
  }

  // HELP - Fist on palm moving up (static: thumbs up fist)
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended && isThumbUp()) {
    return { sign: 'HELP', confidence: 0.78, category: 'phrase' };
  }

  // ==================== NUMBERS ====================

  // 0 / ZERO - O shape
  if (distance2D(indexTip, thumbTip) < 0.05 && fingersTogether) {
    return { sign: 'ZERO', confidence: 0.85, category: 'number' };
  }

  // 1 / ONE - Index only
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return { sign: 'ONE', confidence: 0.92, category: 'number' };
  }

  // 2 / TWO - V sign
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
    return { sign: 'TWO', confidence: 0.88, category: 'number' };
  }

  // 3 / THREE - Thumb, index, middle extended
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
    return { sign: 'THREE', confidence: 0.87, category: 'number' };
  }

  // 4 / FOUR - Four fingers, no thumb
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbExtended) {
    return { sign: 'FOUR', confidence: 0.88, category: 'number' };
  }

  // 5 / FIVE - All fingers spread
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
    return { sign: 'FIVE', confidence: 0.90, category: 'number' };
  }

  // 6 - Pinky and thumb touch, others extended
  if (distance2D(pinkyTip, thumbTip) < 0.06 && indexExtended && middleExtended && ringExtended) {
    return { sign: 'SIX', confidence: 0.83, category: 'number' };
  }

  // 7 - Ring and thumb touch, others extended
  if (distance2D(ringTip, thumbTip) < 0.06 && indexExtended && middleExtended && pinkyExtended) {
    return { sign: 'SEVEN', confidence: 0.82, category: 'number' };
  }

  // 8 - Middle and thumb touch, others extended
  if (distance2D(middleTip, thumbTip) < 0.06 && indexExtended && ringExtended && pinkyExtended) {
    return { sign: 'EIGHT', confidence: 0.82, category: 'number' };
  }

  // 9 - Index and thumb touch, others extended
  if (distance2D(indexTip, thumbTip) < 0.06 && middleExtended && ringExtended && pinkyExtended) {
    return { sign: 'NINE', confidence: 0.84, category: 'number' };
  }

  // 10 - Thumbs up shake (static: thumbs up)
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended) {
    if (isThumbUp()) {
      return { sign: 'TEN', confidence: 0.80, category: 'number' };
    }
  }

  // ==================== GESTURES ====================

  // RAISE HAND - Open palm raised high
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && handRaised) {
    return { sign: 'RAISE HAND', confidence: 0.93, category: 'gesture' };
  }

  // THUMBS UP
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended && isThumbUp()) {
    return { sign: 'THUMBS UP', confidence: 0.92, category: 'gesture' };
  }

  // THUMBS DOWN
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbExtended && isThumbDown()) {
    return { sign: 'THUMBS DOWN', confidence: 0.90, category: 'gesture' };
  }

  // OK sign
  if (distance2D(indexTip, thumbTip) < 0.05 && middleExtended && ringExtended && pinkyExtended) {
    return { sign: 'OK', confidence: 0.88, category: 'gesture' };
  }

  // ROCK ON / HORNS
  if (indexExtended && !middleExtended && !ringExtended && pinkyExtended && !thumbExtended) {
    return { sign: 'ROCK ON', confidence: 0.86, category: 'gesture' };
  }

  // CALL ME / PHONE
  if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && thumbExtended) {
    return { sign: 'CALL ME', confidence: 0.85, category: 'gesture' };
  }

  // POINT / POINTING
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { sign: 'POINT', confidence: 0.82, category: 'gesture' };
  }

  // STOP - Open palm facing forward
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && palmFacingCamera) {
    return { sign: 'STOP', confidence: 0.85, category: 'gesture' };
  }

  // FIST
  if (indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbExtended) {
    return { sign: 'FIST', confidence: 0.90, category: 'gesture' };
  }

  return { sign: 'DETECTING...', confidence: 0.3, category: 'unknown' };
}

// Check specifically for raised hand gesture
export function isRaisedHand(landmarks: HandLandmark[][]): boolean {
  if (!landmarks || landmarks.length === 0) return false;
  
  const prediction = classifySign(landmarks);
  return prediction?.sign === 'RAISE HAND' || prediction?.sign === 'HELLO' || prediction?.sign === 'FIVE';
}
