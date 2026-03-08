// Sign pose definitions for the 3D avatar
// Each pose defines joint rotations for the upper body humanoid

export interface ArmPose {
  // Shoulder rotation [x, y, z] in radians
  shoulderRotation: [number, number, number];
  // Elbow bend angle in radians
  elbowBend: number;
  // Wrist rotation [x, y, z] in radians
  wristRotation: [number, number, number];
  // Hand shape: open, fist, point, flat, claw, pinch
  handShape: 'open' | 'fist' | 'point' | 'flat' | 'claw' | 'pinch' | 'thumbsup' | 'ok';
}

export interface SignPose {
  name: string;
  description: string;
  duration: number; // ms to hold this pose
  rightArm: ArmPose;
  leftArm: ArmPose;
  headTilt?: [number, number, number]; // x, y, z rotation
}

export interface SignAnimation {
  word: string;
  poses: SignPose[];
}

// Default rest pose
export const REST_POSE: SignPose = {
  name: 'rest',
  description: 'Arms at sides',
  duration: 500,
  rightArm: {
    shoulderRotation: [0, 0, -0.1],
    elbowBend: 0.2,
    wristRotation: [0, 0, 0],
    handShape: 'open',
  },
  leftArm: {
    shoulderRotation: [0, 0, 0.1],
    elbowBend: 0.2,
    wristRotation: [0, 0, 0],
    handShape: 'open',
  },
};

// Sign animations dictionary
export const signAnimations: Record<string, SignAnimation> = {
  hello: {
    word: 'hello',
    poses: [
      {
        name: 'hello-1',
        description: 'Raise hand to forehead',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.2, 0.3, -0.5],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0.2],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'hello-2',
        description: 'Wave right',
        duration: 300,
        rightArm: {
          shoulderRotation: [-1.2, 0.5, -0.5],
          elbowBend: 1.3,
          wristRotation: [0, 0.3, 0.2],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'hello-3',
        description: 'Wave left',
        duration: 300,
        rightArm: {
          shoulderRotation: [-1.2, 0.1, -0.5],
          elbowBend: 1.3,
          wristRotation: [0, -0.3, 0.2],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'hello-4',
        description: 'Wave right again',
        duration: 300,
        rightArm: {
          shoulderRotation: [-1.2, 0.5, -0.5],
          elbowBend: 1.3,
          wristRotation: [0, 0.3, 0.2],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  hi: {
    word: 'hi',
    poses: [
      {
        name: 'hi-1',
        description: 'Raise hand wave',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.2, 0.3, -0.5],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0.2],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'hi-2',
        description: 'Wave',
        duration: 300,
        rightArm: {
          shoulderRotation: [-1.2, 0.5, -0.5],
          elbowBend: 1.3,
          wristRotation: [0, 0.3, 0.2],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  goodbye: {
    word: 'goodbye',
    poses: [
      {
        name: 'bye-1',
        description: 'Raise hand palm down',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.0, 0.3, -0.3],
          elbowBend: 1.2,
          wristRotation: [1.5, 0, 0],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'bye-2',
        description: 'Fingers wave down',
        duration: 300,
        rightArm: {
          shoulderRotation: [-1.0, 0.3, -0.3],
          elbowBend: 1.0,
          wristRotation: [1.5, 0, 0.3],
          handShape: 'claw',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'bye-3',
        description: 'Fingers wave up',
        duration: 300,
        rightArm: {
          shoulderRotation: [-1.0, 0.3, -0.3],
          elbowBend: 1.2,
          wristRotation: [1.5, 0, -0.3],
          handShape: 'open',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  please: {
    word: 'please',
    poses: [
      {
        name: 'please-1',
        description: 'Flat hand on chest',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.8, 0.8, -0.3],
          elbowBend: 1.8,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'please-2',
        description: 'Circle clockwise',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.6, 0.9, -0.3],
          elbowBend: 1.7,
          wristRotation: [0, 0.3, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'please-3',
        description: 'Complete circle',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.8, 0.7, -0.3],
          elbowBend: 1.8,
          wristRotation: [0, -0.3, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  'thank you': {
    word: 'thank you',
    poses: [
      {
        name: 'thanks-1',
        description: 'Flat hand touches chin',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.3, 0.6, -0.3],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'thanks-2',
        description: 'Move hand forward and down',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.0,
          wristRotation: [0.5, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  thanks: {
    word: 'thanks',
    poses: [
      {
        name: 'thanks-1',
        description: 'Flat hand touches chin',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.3, 0.6, -0.3],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'thanks-2',
        description: 'Move hand forward',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.0,
          wristRotation: [0.5, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  yes: {
    word: 'yes',
    poses: [
      {
        name: 'yes-1',
        description: 'Fist nod down',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.5,
          wristRotation: [0.3, 0, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0.15, 0, 0],
      },
      {
        name: 'yes-2',
        description: 'Fist nod up',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.5,
          wristRotation: [-0.2, 0, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [-0.1, 0, 0],
      },
      {
        name: 'yes-3',
        description: 'Nod again',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.5,
          wristRotation: [0.3, 0, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0.15, 0, 0],
      },
    ],
  },

  no: {
    word: 'no',
    poses: [
      {
        name: 'no-1',
        description: 'Index and middle finger snap to thumb',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'pinch',
        },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, -0.15, 0],
      },
      {
        name: 'no-2',
        description: 'Open fingers',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, 0.15, 0],
      },
      {
        name: 'no-3',
        description: 'Snap again',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'pinch',
        },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, -0.1, 0],
      },
    ],
  },

  sorry: {
    word: 'sorry',
    poses: [
      {
        name: 'sorry-1',
        description: 'Fist on chest',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.7, 0.8, -0.3],
          elbowBend: 1.8,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'sorry-2',
        description: 'Circle on chest',
        duration: 600,
        rightArm: {
          shoulderRotation: [-0.5, 0.9, -0.3],
          elbowBend: 1.7,
          wristRotation: [0, 0.2, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'sorry-3',
        description: 'Complete circle',
        duration: 600,
        rightArm: {
          shoulderRotation: [-0.7, 0.7, -0.3],
          elbowBend: 1.8,
          wristRotation: [0, -0.2, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  help: {
    word: 'help',
    poses: [
      {
        name: 'help-1',
        description: 'Fist on flat palm',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.6, 0.3, -0.2],
          elbowBend: 1.2,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.3, 0.2],
          elbowBend: 1.2,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
      {
        name: 'help-2',
        description: 'Lift both hands up',
        duration: 500,
        rightArm: {
          shoulderRotation: [-1.0, 0.3, -0.2],
          elbowBend: 1.0,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-1.0, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
    ],
  },

  love: {
    word: 'love',
    poses: [
      {
        name: 'love-1',
        description: 'Cross arms on chest',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.5, 1.0, -0.3],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-0.5, -1.0, 0.3],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
      },
      {
        name: 'love-2',
        description: 'Hug self',
        duration: 600,
        rightArm: {
          shoulderRotation: [-0.4, 1.2, -0.3],
          elbowBend: 2.2,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-0.4, -1.2, 0.3],
          elbowBend: 2.2,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
      },
    ],
  },

  good: {
    word: 'good',
    poses: [
      {
        name: 'good-1',
        description: 'Flat hand at chin',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.3, 0.5, -0.3],
          elbowBend: 1.8,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
      {
        name: 'good-2',
        description: 'Move down to other palm',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.6, 0.3, -0.2],
          elbowBend: 1.2,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
    ],
  },

  bad: {
    word: 'bad',
    poses: [
      {
        name: 'bad-1',
        description: 'Flat hand at chin',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.3, 0.5, -0.3],
          elbowBend: 1.8,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'bad-2',
        description: 'Flip hand down',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.8, 0.3, -0.3],
          elbowBend: 1.2,
          wristRotation: [2.5, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  understand: {
    word: 'understand',
    poses: [
      {
        name: 'understand-1',
        description: 'Index finger at temple, curled',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.4, 0.5, -0.5],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'understand-2',
        description: 'Flick finger up',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.4, 0.5, -0.5],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0.3],
          handShape: 'point',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  learn: {
    word: 'learn',
    poses: [
      {
        name: 'learn-1',
        description: 'Grab from palm to head',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.5, 0.3, -0.2],
          elbowBend: 1.2,
          wristRotation: [0, 0, 0],
          handShape: 'open',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
      {
        name: 'learn-2',
        description: 'Close hand, bring to forehead',
        duration: 500,
        rightArm: {
          shoulderRotation: [-1.3, 0.5, -0.4],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'claw',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
    ],
  },

  teacher: {
    word: 'teacher',
    poses: [
      {
        name: 'teacher-1',
        description: 'Both hands at temples',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.4, 0.4, -0.5],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: {
          shoulderRotation: [-1.4, -0.4, 0.5],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
      },
      {
        name: 'teacher-2',
        description: 'Move hands forward',
        duration: 500,
        rightArm: {
          shoulderRotation: [-1.0, 0.3, -0.3],
          elbowBend: 1.3,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: {
          shoulderRotation: [-1.0, -0.3, 0.3],
          elbowBend: 1.3,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
      },
    ],
  },

  student: {
    word: 'student',
    poses: [
      {
        name: 'student-1',
        description: 'Grab from palm',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.5, 0.3, -0.2],
          elbowBend: 1.2,
          wristRotation: [0, 0, 0],
          handShape: 'open',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
      {
        name: 'student-2',
        description: 'Bring to forehead then out',
        duration: 500,
        rightArm: {
          shoulderRotation: [-1.3, 0.5, -0.4],
          elbowBend: 2.0,
          wristRotation: [0, 0, 0],
          handShape: 'claw',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.3, 0.2],
          elbowBend: 1.0,
          wristRotation: [-0.5, 0, 0],
          handShape: 'flat',
        },
      },
    ],
  },

  stop: {
    word: 'stop',
    poses: [
      {
        name: 'stop-1',
        description: 'Raise hand flat, palm forward',
        duration: 400,
        rightArm: {
          shoulderRotation: [-1.4, 0.2, -0.3],
          elbowBend: 0.3,
          wristRotation: [0, 0, 0],
          handShape: 'flat',
        },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  wait: {
    word: 'wait',
    poses: [
      {
        name: 'wait-1',
        description: 'Both hands wiggle fingers',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.6, 0.4, -0.3],
          elbowBend: 1.2,
          wristRotation: [0, 0, 0.2],
          handShape: 'open',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.4, 0.3],
          elbowBend: 1.2,
          wristRotation: [0, 0, -0.2],
          handShape: 'open',
        },
      },
      {
        name: 'wait-2',
        description: 'Wiggle other way',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.6, 0.4, -0.3],
          elbowBend: 1.2,
          wristRotation: [0, 0, -0.2],
          handShape: 'claw',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.4, 0.3],
          elbowBend: 1.2,
          wristRotation: [0, 0, 0.2],
          handShape: 'claw',
        },
      },
    ],
  },

  name: {
    word: 'name',
    poses: [
      {
        name: 'name-1',
        description: 'Two fingers tap on two fingers',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.7, 0.4, -0.3],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
        leftArm: {
          shoulderRotation: [-0.7, -0.4, 0.3],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
      },
      {
        name: 'name-2',
        description: 'Tap again',
        duration: 300,
        rightArm: {
          shoulderRotation: [-0.8, 0.4, -0.3],
          elbowBend: 1.6,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
        leftArm: {
          shoulderRotation: [-0.8, -0.4, 0.3],
          elbowBend: 1.6,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
      },
    ],
  },

  what: {
    word: 'what',
    poses: [
      {
        name: 'what-1',
        description: 'Both palms up, shrug',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.5, 0.5, -0.4],
          elbowBend: 1.3,
          wristRotation: [-1.0, 0, 0],
          handShape: 'open',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.5, 0.4],
          elbowBend: 1.3,
          wristRotation: [-1.0, 0, 0],
          handShape: 'open',
        },
        headTilt: [0, 0, 0.1],
      },
      {
        name: 'what-2',
        description: 'Shake hands',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.5, 0.6, -0.4],
          elbowBend: 1.2,
          wristRotation: [-1.0, 0.2, 0],
          handShape: 'open',
        },
        leftArm: {
          shoulderRotation: [-0.5, -0.6, 0.4],
          elbowBend: 1.2,
          wristRotation: [-1.0, -0.2, 0],
          handShape: 'open',
        },
        headTilt: [0, 0, -0.1],
      },
    ],
  },

  how: {
    word: 'how',
    poses: [
      {
        name: 'how-1',
        description: 'Fists together, knuckles touching',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.6, 0.4, -0.2],
          elbowBend: 1.5,
          wristRotation: [1.5, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.4, 0.2],
          elbowBend: 1.5,
          wristRotation: [1.5, 0, 0],
          handShape: 'fist',
        },
      },
      {
        name: 'how-2',
        description: 'Roll fists outward',
        duration: 500,
        rightArm: {
          shoulderRotation: [-0.6, 0.5, -0.2],
          elbowBend: 1.3,
          wristRotation: [0.5, 0, 0],
          handShape: 'open',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.5, 0.2],
          elbowBend: 1.3,
          wristRotation: [0.5, 0, 0],
          handShape: 'open',
        },
      },
    ],
  },

  practice: {
    word: 'practice',
    poses: [
      {
        name: 'practice-1',
        description: 'Fist rubs on index finger',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.6, 0.4, -0.2],
          elbowBend: 1.4,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.3, 0.2],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
      },
      {
        name: 'practice-2',
        description: 'Rub back',
        duration: 400,
        rightArm: {
          shoulderRotation: [-0.7, 0.4, -0.2],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'fist',
        },
        leftArm: {
          shoulderRotation: [-0.6, -0.3, 0.2],
          elbowBend: 1.5,
          wristRotation: [0, 0, 0],
          handShape: 'point',
        },
      },
    ],
  },
};