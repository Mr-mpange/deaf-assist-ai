/**
 * Production-ready sign classifier with temporal smoothing,
 * multi-frame validation, and expanded vocabulary.
 */

import type { HandLandmark, SignPrediction } from '@/hooks/useHandDetection';

interface DetectionBuffer {
  sign: string;
  confidence: number;
  timestamp: number;
}

const BUFFER_SIZE = 8;
const STABILITY_THRESHOLD = 4; // Need 4/8 frames agreeing
const MIN_CONFIDENCE = 0.70;
const HOLD_TIME_MS = 400; // Must hold sign for 400ms

let detectionBuffer: DetectionBuffer[] = [];
let lastStableSign: string | null = null;
let lastStableTime = 0;

export function resetClassifier() {
  detectionBuffer = [];
  lastStableSign = null;
  lastStableTime = 0;
}

/**
 * Classify with temporal smoothing for production accuracy.
 * Returns null if sign is not stable enough.
 */
export function classifyWithSmoothing(
  landmarks: HandLandmark[][],
  rawClassify: (landmarks: HandLandmark[][]) => SignPrediction | null
): SignPrediction | null {
  const raw = rawClassify(landmarks);
  if (!raw || raw.confidence < MIN_CONFIDENCE) return null;

  const now = Date.now();

  detectionBuffer.push({ sign: raw.sign, confidence: raw.confidence, timestamp: now });
  if (detectionBuffer.length > BUFFER_SIZE) {
    detectionBuffer.shift();
  }

  // Count occurrences of each sign in the buffer
  const counts: Record<string, { count: number; totalConf: number }> = {};
  for (const entry of detectionBuffer) {
    if (!counts[entry.sign]) counts[entry.sign] = { count: 0, totalConf: 0 };
    counts[entry.sign].count++;
    counts[entry.sign].totalConf += entry.confidence;
  }

  // Find the dominant sign
  let bestSign = '';
  let bestCount = 0;
  let bestAvgConf = 0;
  for (const [sign, data] of Object.entries(counts)) {
    if (data.count > bestCount || (data.count === bestCount && data.totalConf / data.count > bestAvgConf)) {
      bestSign = sign;
      bestCount = data.count;
      bestAvgConf = data.totalConf / data.count;
    }
  }

  // Require stability threshold
  if (bestCount < STABILITY_THRESHOLD) return null;

  // Check hold time
  if (bestSign !== lastStableSign) {
    lastStableSign = bestSign;
    lastStableTime = now;
    return null;
  }

  if (now - lastStableTime < HOLD_TIME_MS) return null;

  // Boost confidence based on stability
  const stabilityBoost = Math.min(0.1, (bestCount / BUFFER_SIZE) * 0.1);
  const finalConfidence = Math.min(0.99, bestAvgConf + stabilityBoost);

  return {
    sign: bestSign,
    confidence: finalConfidence,
    category: raw.category,
  };
}

/**
 * Enhanced hand geometry analysis for better disambiguation
 */
export function analyzeHandGeometry(hand: HandLandmark[]) {
  if (hand.length < 21) return null;

  const wrist = hand[0];
  const thumbTip = hand[4];
  const indexTip = hand[8];
  const middleTip = hand[12];
  const ringTip = hand[16];
  const pinkyTip = hand[20];
  const indexMCP = hand[5];
  const middleMCP = hand[9];

  // Palm size (normalized reference)
  const palmSize = Math.sqrt(
    (indexMCP.x - wrist.x) ** 2 + (indexMCP.y - wrist.y) ** 2
  );

  // Hand orientation
  const palmNormalZ = middleMCP.z - wrist.z;
  const isFacingCamera = palmNormalZ < 0;

  // Finger spread angle
  const indexAngle = Math.atan2(indexTip.y - indexMCP.y, indexTip.x - indexMCP.x);
  const pinkyAngle = Math.atan2(pinkyTip.y - hand[17].y, pinkyTip.x - hand[17].x);
  const spreadAngle = Math.abs(indexAngle - pinkyAngle);

  // Hand tilt
  const tiltAngle = Math.atan2(middleMCP.y - wrist.y, middleMCP.x - wrist.x);

  return {
    palmSize,
    isFacingCamera,
    spreadAngle,
    tiltAngle,
    fingerTips: { thumbTip, indexTip, middleTip, ringTip, pinkyTip },
  };
}

/**
 * Get detection quality metrics for UI feedback
 */
export function getDetectionQuality(landmarks: HandLandmark[][]): {
  handVisible: boolean;
  handCount: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  tip: string;
} {
  if (!landmarks || landmarks.length === 0) {
    return { handVisible: false, handCount: 0, quality: 'poor', tip: 'No hand detected. Show your hand clearly.' };
  }

  const hand = landmarks[0];
  if (hand.length < 21) {
    return { handVisible: false, handCount: landmarks.length, quality: 'poor', tip: 'Hand partially visible. Move closer.' };
  }

  const geometry = analyzeHandGeometry(hand);
  if (!geometry) {
    return { handVisible: true, handCount: landmarks.length, quality: 'fair', tip: 'Keep your hand steady.' };
  }

  // Check if hand is too small
  if (geometry.palmSize < 0.05) {
    return { handVisible: true, handCount: landmarks.length, quality: 'fair', tip: 'Move your hand closer to the camera.' };
  }

  // Check if hand is centered
  const wrist = hand[0];
  const isOffCenter = wrist.x < 0.15 || wrist.x > 0.85 || wrist.y < 0.1 || wrist.y > 0.9;
  if (isOffCenter) {
    return { handVisible: true, handCount: landmarks.length, quality: 'fair', tip: 'Center your hand in the frame.' };
  }

  if (geometry.palmSize > 0.1) {
    return { handVisible: true, handCount: landmarks.length, quality: 'excellent', tip: 'Perfect positioning!' };
  }

  return { handVisible: true, handCount: landmarks.length, quality: 'good', tip: 'Good hand position.' };
}
