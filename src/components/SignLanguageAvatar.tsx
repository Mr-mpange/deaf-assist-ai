import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { signAnimations, REST_POSE, type SignPose, type ArmPose } from '@/data/signPoses';

// Lerp helper for smooth transitions
function lerpValue(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

function lerpArray(current: number[], target: number[], t: number): number[] {
  return current.map((v, i) => lerpValue(v, target[i], t));
}

// --- 3D Hand Component ---
function Hand({ handShape, side }: { handShape: string; side: 'left' | 'right' }) {
  const mirror = side === 'left' ? -1 : 1;

  // Palm
  const palmGeom = useMemo(() => new THREE.BoxGeometry(0.12, 0.15, 0.04), []);

  // Finger configs based on hand shape
  const fingers = useMemo(() => {
    const baseFingers = [
      { x: -0.04, y: 0.1, length: 0.08 },  // Index
      { x: -0.015, y: 0.11, length: 0.09 }, // Middle
      { x: 0.015, y: 0.1, length: 0.08 },   // Ring
      { x: 0.04, y: 0.09, length: 0.07 },   // Pinky
    ];

    switch (handShape) {
      case 'fist':
        return baseFingers.map(f => ({ ...f, length: 0.03, curl: 1.5 }));
      case 'point':
        return baseFingers.map((f, i) => ({
          ...f,
          length: i === 0 ? 0.1 : 0.03,
          curl: i === 0 ? 0 : 1.5,
        }));
      case 'flat':
        return baseFingers.map(f => ({ ...f, curl: 0 }));
      case 'claw':
        return baseFingers.map(f => ({ ...f, curl: 0.7 }));
      case 'pinch':
        return baseFingers.map((f, i) => ({
          ...f,
          length: i === 0 ? 0.06 : 0.05,
          curl: i <= 1 ? 0.8 : 1.2,
        }));
      case 'thumbsup':
        return baseFingers.map(f => ({ ...f, length: 0.03, curl: 1.5 }));
      case 'ok':
        return baseFingers.map((f, i) => ({
          ...f,
          length: i === 0 ? 0.05 : f.length,
          curl: i === 0 ? 1.2 : 0,
        }));
      default: // open
        return baseFingers.map(f => ({ ...f, curl: 0 }));
    }
  }, [handShape]);

  // Thumb
  const thumbCurl = handShape === 'fist' ? 1.0 : handShape === 'thumbsup' ? -0.3 : 0.2;

  return (
    <group scale={[mirror, 1, 1]}>
      {/* Palm */}
      <mesh geometry={palmGeom}>
        <meshStandardMaterial color="#e8b89d" roughness={0.6} />
      </mesh>

      {/* Thumb */}
      <group position={[-0.07, 0.02, 0]} rotation={[0, 0, -0.5 + thumbCurl]}>
        <mesh position={[0, 0.04, 0]}>
          <capsuleGeometry args={[0.015, 0.06, 4, 8]} />
          <meshStandardMaterial color="#e0ad91" roughness={0.6} />
        </mesh>
      </group>

      {/* Fingers */}
      {fingers.map((finger, i) => (
        <group key={i} position={[finger.x, 0.075, 0]} rotation={[finger.curl || 0, 0, 0]}>
          <mesh position={[0, finger.length / 2, 0]}>
            <capsuleGeometry args={[0.012, finger.length, 4, 8]} />
            <meshStandardMaterial color="#e0ad91" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- 3D Arm Component ---
function Arm({
  pose,
  side,
  lerpFactor,
}: {
  pose: ArmPose;
  side: 'left' | 'right';
  lerpFactor: number;
}) {
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);

  const mirror = side === 'left' ? -1 : 1;
  const upperArmLength = 0.35;
  const forearmLength = 0.3;

  useFrame(() => {
    if (shoulderRef.current) {
      shoulderRef.current.rotation.x = lerpValue(shoulderRef.current.rotation.x, pose.shoulderRotation[0], lerpFactor);
      shoulderRef.current.rotation.y = lerpValue(shoulderRef.current.rotation.y, pose.shoulderRotation[1] * mirror, lerpFactor);
      shoulderRef.current.rotation.z = lerpValue(shoulderRef.current.rotation.z, pose.shoulderRotation[2] * mirror, lerpFactor);
    }
    if (elbowRef.current) {
      elbowRef.current.rotation.x = lerpValue(elbowRef.current.rotation.x, -pose.elbowBend, lerpFactor);
    }
    if (wristRef.current) {
      wristRef.current.rotation.x = lerpValue(wristRef.current.rotation.x, pose.wristRotation[0], lerpFactor);
      wristRef.current.rotation.y = lerpValue(wristRef.current.rotation.y, pose.wristRotation[1], lerpFactor);
      wristRef.current.rotation.z = lerpValue(wristRef.current.rotation.z, pose.wristRotation[2], lerpFactor);
    }
  });

  return (
    <group position={[0.22 * mirror, 0.35, 0]}>
      {/* Shoulder joint */}
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#5b8fd9" roughness={0.4} />
      </mesh>

      <group ref={shoulderRef}>
        {/* Upper arm */}
        <mesh position={[0, -upperArmLength / 2, 0]}>
          <capsuleGeometry args={[0.04, upperArmLength, 8, 16]} />
          <meshStandardMaterial color="#e8b89d" roughness={0.5} />
        </mesh>

        {/* Elbow */}
        <group position={[0, -upperArmLength, 0]}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#dda88e" roughness={0.5} />
          </mesh>

          <group ref={elbowRef}>
            {/* Forearm */}
            <mesh position={[0, -forearmLength / 2, 0]}>
              <capsuleGeometry args={[0.035, forearmLength, 8, 16]} />
              <meshStandardMaterial color="#e8b89d" roughness={0.5} />
            </mesh>

            {/* Wrist */}
            <group position={[0, -forearmLength, 0]} ref={wristRef}>
              <Hand handShape={pose.handShape} side={side} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// --- 3D Avatar Body ---
function AvatarBody({
  currentPose,
  lerpSpeed = 0.08,
}: {
  currentPose: SignPose;
  lerpSpeed?: number;
}) {
  const headRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (headRef.current && currentPose.headTilt) {
      headRef.current.rotation.x = lerpValue(headRef.current.rotation.x, currentPose.headTilt[0], lerpSpeed);
      headRef.current.rotation.y = lerpValue(headRef.current.rotation.y, currentPose.headTilt[1], lerpSpeed);
      headRef.current.rotation.z = lerpValue(headRef.current.rotation.z, currentPose.headTilt[2], lerpSpeed);
    } else if (headRef.current) {
      headRef.current.rotation.x = lerpValue(headRef.current.rotation.x, 0, lerpSpeed);
      headRef.current.rotation.y = lerpValue(headRef.current.rotation.y, 0, lerpSpeed);
      headRef.current.rotation.z = lerpValue(headRef.current.rotation.z, 0, lerpSpeed);
    }
  });

  return (
    <group position={[0, -0.3, 0]}>
      {/* Torso */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.4, 8, 16]} />
        <meshStandardMaterial color="#4a7bc7" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Collar / Neck area */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.1, 12]} />
        <meshStandardMaterial color="#e8b89d" roughness={0.5} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 0.55, 0]}>
        {/* Head shape */}
        <mesh>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial color="#e8b89d" roughness={0.4} />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.145, 24, 24]} />
          <meshStandardMaterial color="#3d2b1f" roughness={0.8} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.045, 0.02, 0.12]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshStandardMaterial color="#2c5f8a" />
        </mesh>
        <mesh position={[0.045, 0.02, 0.12]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshStandardMaterial color="#2c5f8a" />
        </mesh>

        {/* Eye whites */}
        <mesh position={[-0.045, 0.02, 0.115]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.045, 0.02, 0.115]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>

        {/* Smile */}
        <mesh position={[0, -0.04, 0.13]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.03, 0.006, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#c4756e" />
        </mesh>
      </group>

      {/* Arms */}
      <Arm pose={currentPose.rightArm} side="right" lerpFactor={lerpSpeed} />
      <Arm pose={currentPose.leftArm} side="left" lerpFactor={lerpSpeed} />
    </group>
  );
}

// --- Main Scene ---
function AvatarScene({ currentPose }: { currentPose: SignPose }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} castShadow />
      <directionalLight position={[-2, 3, -2]} intensity={0.3} />
      <pointLight position={[0, 2, 3]} intensity={0.4} color="#ffeedd" />

      <AvatarBody currentPose={currentPose} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </>
  );
}

// --- Exported Panel Component ---
interface SignLanguageAvatarProps {
  currentWord?: string | null;
  /** Queue of words to animate through */
  wordQueue?: string[];
  onAnimationComplete?: () => void;
}

export function SignLanguageAvatar({
  currentWord,
  wordQueue = [],
  onAnimationComplete,
}: SignLanguageAvatarProps) {
  const [currentPose, setCurrentPose] = useState<SignPose>(REST_POSE);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayWord, setDisplayWord] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<string[]>([]);

  // Process animation queue
  const animateWord = useCallback((word: string) => {
    const animation = signAnimations[word.toLowerCase()];
    if (!animation) return;

    setIsAnimating(true);
    setDisplayWord(word);

    let totalDelay = 0;
    animation.poses.forEach((pose, index) => {
      const timeout = setTimeout(() => {
        setCurrentPose(pose);
      }, totalDelay);

      totalDelay += pose.duration;

      if (index === animation.poses.length - 1) {
        // After last pose, hold briefly then return to rest
        setTimeout(() => {
          setCurrentPose(REST_POSE);
          setIsAnimating(false);
          setDisplayWord(null);
          onAnimationComplete?.();

          // Process next word in queue
          if (queueRef.current.length > 0) {
            const nextWord = queueRef.current.shift()!;
            setTimeout(() => animateWord(nextWord), 200);
          }
        }, totalDelay + 300);
      }
    });
  }, [onAnimationComplete]);

  // Handle new word
  useEffect(() => {
    if (currentWord && !isAnimating) {
      const lowerWord = currentWord.toLowerCase();
      if (signAnimations[lowerWord]) {
        animateWord(lowerWord);
      }
    } else if (currentWord && isAnimating) {
      const lowerWord = currentWord.toLowerCase();
      if (signAnimations[lowerWord]) {
        queueRef.current.push(lowerWord);
      }
    }
  }, [currentWord, animateWord]);

  // Handle word queue
  useEffect(() => {
    if (wordQueue.length > 0 && !isAnimating) {
      const validWords = wordQueue.filter(w => signAnimations[w.toLowerCase()]);
      if (validWords.length > 0) {
        queueRef.current = validWords.slice(1);
        animateWord(validWords[0].toLowerCase());
      }
    }
  }, [wordQueue, animateWord]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    queueRef.current = [];
    setCurrentPose(REST_POSE);
    setIsAnimating(false);
    setDisplayWord(null);
  };

  return (
    <Card className="border-border/50 shadow-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Sign Avatar
            {isAnimating && (
              <Badge variant="default" className="text-xs animate-pulse">
                Signing
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset pose">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-0">
          {/* 3D Canvas */}
          <div className="h-64 w-full bg-gradient-to-b from-muted/30 to-muted/60 relative">
            <Canvas
              camera={{ position: [0, 0.2, 1.8], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
            >
              <AvatarScene currentPose={currentPose} />
            </Canvas>

            {/* Current word overlay */}
            {displayWord && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="text-sm px-3 py-1 shadow-lg">
                  Signing: "{displayWord}"
                </Badge>
              </div>
            )}
          </div>

          {/* Quick action buttons */}
          <div className="p-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Try a sign:</p>
              <Badge variant="outline" className="text-xs">
                {Object.keys(signAnimations).length} signs
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {Object.keys(signAnimations).map((word) => (
                <Button
                  key={word}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2"
                  disabled={isAnimating}
                  onClick={() => animateWord(word)}
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}