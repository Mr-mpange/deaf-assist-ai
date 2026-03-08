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
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'fist' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'point' },
      },
      {
        name: 'practice-2',
        description: 'Rub back',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.4, -0.2], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'fist' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'point' },
      },
    ],
  },

  // --- Additional signs to reach 50+ ---

  friend: {
    word: 'friend',
    poses: [
      {
        name: 'friend-1', description: 'Hook index fingers together',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.2], elbowBend: 1.4, wristRotation: [0, 0, 0.3], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.6, -0.4, 0.2], elbowBend: 1.4, wristRotation: [0, 0, -0.3], handShape: 'point' },
      },
      {
        name: 'friend-2', description: 'Flip and hook again',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.2], elbowBend: 1.4, wristRotation: [0, 0, -0.3], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.6, -0.4, 0.2], elbowBend: 1.4, wristRotation: [0, 0, 0.3], handShape: 'point' },
      },
    ],
  },

  family: {
    word: 'family',
    poses: [
      {
        name: 'family-1', description: 'Both hands F shape, circle outward',
        duration: 500,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.3, wristRotation: [0, 0.3, 0], handShape: 'ok' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.3, wristRotation: [0, -0.3, 0], handShape: 'ok' },
      },
      {
        name: 'family-2', description: 'Complete circle',
        duration: 500,
        rightArm: { shoulderRotation: [-0.7, 0.5, -0.2], elbowBend: 1.3, wristRotation: [0, -0.3, 0], handShape: 'ok' },
        leftArm: { shoulderRotation: [-0.7, -0.5, 0.2], elbowBend: 1.3, wristRotation: [0, 0.3, 0], handShape: 'ok' },
      },
    ],
  },

  eat: {
    word: 'eat',
    poses: [
      {
        name: 'eat-1', description: 'Pinched hand to mouth',
        duration: 400,
        rightArm: { shoulderRotation: [-1.3, 0.5, -0.3], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'eat-2', description: 'Tap mouth again',
        duration: 300,
        rightArm: { shoulderRotation: [-1.2, 0.4, -0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  drink: {
    word: 'drink',
    poses: [
      {
        name: 'drink-1', description: 'C-hand tilt to mouth',
        duration: 400,
        rightArm: { shoulderRotation: [-1.2, 0.4, -0.3], elbowBend: 1.8, wristRotation: [0.3, 0, 0], handShape: 'claw' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'drink-2', description: 'Tilt up',
        duration: 400,
        rightArm: { shoulderRotation: [-1.4, 0.4, -0.3], elbowBend: 2.0, wristRotation: [0.8, 0, 0], handShape: 'claw' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  water: {
    word: 'water',
    poses: [
      {
        name: 'water-1', description: 'W hand taps chin',
        duration: 400,
        rightArm: { shoulderRotation: [-1.3, 0.5, -0.3], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'water-2', description: 'Tap again',
        duration: 300,
        rightArm: { shoulderRotation: [-1.2, 0.5, -0.3], elbowBend: 1.9, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  happy: {
    word: 'happy',
    poses: [
      {
        name: 'happy-1', description: 'Flat hand brushes chest upward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.7, -0.3], elbowBend: 1.6, wristRotation: [0, 0, 0], handShape: 'flat' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'happy-2', description: 'Brush up again',
        duration: 400,
        rightArm: { shoulderRotation: [-0.9, 0.7, -0.3], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'flat' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  sad: {
    word: 'sad',
    poses: [
      {
        name: 'sad-1', description: 'Both hands drop from face',
        duration: 500,
        rightArm: { shoulderRotation: [-1.2, 0.4, -0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { shoulderRotation: [-1.2, -0.4, 0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'open' },
        headTilt: [0.1, 0, 0],
      },
      {
        name: 'sad-2', description: 'Hands move down',
        duration: 500,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.3], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { shoulderRotation: [-0.6, -0.4, 0.3], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'open' },
        headTilt: [0.15, 0, 0],
      },
    ],
  },

  more: {
    word: 'more',
    poses: [
      {
        name: 'more-1', description: 'Pinched hands come together',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.2], elbowBend: 1.3, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { shoulderRotation: [-0.6, -0.4, 0.2], elbowBend: 1.3, wristRotation: [0, 0, 0], handShape: 'pinch' },
      },
      {
        name: 'more-2', description: 'Tap together',
        duration: 300,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'pinch' },
      },
    ],
  },

  again: {
    word: 'again',
    poses: [
      {
        name: 'again-1', description: 'Curved hand flips into palm',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.2, wristRotation: [0, 0, 0.3], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'again-2', description: 'Flip into palm',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.4, wristRotation: [0.5, 0, 0], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  correct: {
    word: 'correct',
    poses: [
      {
        name: 'correct-1', description: 'Index fingers point, stack',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'point' },
      },
      {
        name: 'correct-2', description: 'Stack together',
        duration: 300,
        rightArm: { shoulderRotation: [-0.7, 0.2, -0.2], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.2, 0.2], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'point' },
      },
    ],
  },

  wrong: {
    word: 'wrong',
    poses: [
      {
        name: 'wrong-1', description: 'Y hand on chin',
        duration: 500,
        rightArm: { shoulderRotation: [-1.3, 0.5, -0.3], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, -0.1, 0],
      },
    ],
  },

  question: {
    word: 'question',
    poses: [
      {
        name: 'question-1', description: 'Index finger draws question mark',
        duration: 400,
        rightArm: { shoulderRotation: [-1.0, 0.3, -0.3], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'question-2', description: 'Curve down',
        duration: 400,
        rightArm: { shoulderRotation: [-0.8, 0.4, -0.3], elbowBend: 1.4, wristRotation: [0.3, 0.2, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'question-3', description: 'Dot',
        duration: 300,
        rightArm: { shoulderRotation: [-0.7, 0.4, -0.3], elbowBend: 1.5, wristRotation: [0.5, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  answer: {
    word: 'answer',
    poses: [
      {
        name: 'answer-1', description: 'Index fingers at lips, move forward',
        duration: 400,
        rightArm: { shoulderRotation: [-1.3, 0.4, -0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-1.3, -0.4, 0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'point' },
      },
      {
        name: 'answer-2', description: 'Move forward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.9, 0.3, -0.2], elbowBend: 1.2, wristRotation: [0.3, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.9, -0.3, 0.2], elbowBend: 1.2, wristRotation: [0.3, 0, 0], handShape: 'point' },
      },
    ],
  },

  repeat: {
    word: 'repeat',
    poses: [
      {
        name: 'repeat-1', description: 'Curved hand flips into palm',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'repeat-2', description: 'Flip again',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.4, wristRotation: [0.5, 0, 0], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  'try again': {
    word: 'try again',
    poses: [
      {
        name: 'try-1', description: 'Both hands push forward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'open' },
      },
      {
        name: 'try-2', description: 'Push forward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.8, 0.2, -0.2], elbowBend: 0.8, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { shoulderRotation: [-0.8, -0.2, 0.2], elbowBend: 0.8, wristRotation: [0, 0, 0], handShape: 'open' },
      },
    ],
  },

  work: {
    word: 'work',
    poses: [
      {
        name: 'work-1', description: 'Fist taps on fist',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.3, wristRotation: [0, 0, 0], handShape: 'fist' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'fist' },
      },
      {
        name: 'work-2', description: 'Tap again',
        duration: 300,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'fist' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'fist' },
      },
    ],
  },

  school: {
    word: 'school',
    poses: [
      {
        name: 'school-1', description: 'Clap hands twice',
        duration: 300,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'school-2', description: 'Clap',
        duration: 300,
        rightArm: { shoulderRotation: [-0.7, 0.2, -0.2], elbowBend: 1.4, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.7, -0.2, 0.2], elbowBend: 1.4, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  home: {
    word: 'home',
    poses: [
      {
        name: 'home-1', description: 'Pinched hand at cheek',
        duration: 400,
        rightArm: { shoulderRotation: [-1.3, 0.6, -0.4], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'home-2', description: 'Move to temple',
        duration: 400,
        rightArm: { shoulderRotation: [-1.4, 0.5, -0.5], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  want: {
    word: 'want',
    poses: [
      {
        name: 'want-1', description: 'Claw hands pull toward body',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.6, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'claw' },
      },
      {
        name: 'want-2', description: 'Pull in',
        duration: 400,
        rightArm: { shoulderRotation: [-0.5, 0.5, -0.2], elbowBend: 1.5, wristRotation: [-0.3, 0, 0], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.5, -0.5, 0.2], elbowBend: 1.5, wristRotation: [-0.3, 0, 0], handShape: 'claw' },
      },
    ],
  },

  need: {
    word: 'need',
    poses: [
      {
        name: 'need-1', description: 'X hand bends down',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.3, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'need-2', description: 'Bend down',
        duration: 400,
        rightArm: { shoulderRotation: [-0.5, 0.3, -0.2], elbowBend: 1.5, wristRotation: [0.5, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  like: {
    word: 'like',
    poses: [
      {
        name: 'like-1', description: 'Thumb and middle finger pull from chest',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.7, -0.3], elbowBend: 1.6, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'like-2', description: 'Pull forward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.2], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  'don\'t like': {
    word: "don't like",
    poses: [
      {
        name: 'dontlike-1', description: 'Pinch from chest, flick away',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.7, -0.3], elbowBend: 1.6, wristRotation: [0, 0, 0], handShape: 'pinch' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'dontlike-2', description: 'Flick away',
        duration: 400,
        rightArm: { shoulderRotation: [-0.4, 0.5, -0.4], elbowBend: 1.0, wristRotation: [0.5, 0.3, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  think: {
    word: 'think',
    poses: [
      {
        name: 'think-1', description: 'Point finger at forehead',
        duration: 500,
        rightArm: { shoulderRotation: [-1.4, 0.5, -0.5], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0.05, 0, 0],
      },
    ],
  },

  know: {
    word: 'know',
    poses: [
      {
        name: 'know-1', description: 'Flat hand taps forehead',
        duration: 400,
        rightArm: { shoulderRotation: [-1.4, 0.5, -0.5], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'flat' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'know-2', description: 'Tap',
        duration: 300,
        rightArm: { shoulderRotation: [-1.3, 0.5, -0.5], elbowBend: 1.9, wristRotation: [0, 0, 0], handShape: 'flat' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  'don\'t know': {
    word: "don't know",
    poses: [
      {
        name: 'dontknow-1', description: 'Flat hand at forehead then away',
        duration: 400,
        rightArm: { shoulderRotation: [-1.4, 0.5, -0.5], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'flat' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'dontknow-2', description: 'Move away, shake',
        duration: 400,
        rightArm: { shoulderRotation: [-0.8, 0.5, -0.4], elbowBend: 1.2, wristRotation: [0.5, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, -0.1, 0],
      },
    ],
  },

  where: {
    word: 'where',
    poses: [
      {
        name: 'where-1', description: 'Index finger wags side to side',
        duration: 300,
        rightArm: { shoulderRotation: [-0.8, 0.3, -0.3], elbowBend: 1.3, wristRotation: [0, 0.3, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, 0, 0.05],
      },
      {
        name: 'where-2', description: 'Wag other side',
        duration: 300,
        rightArm: { shoulderRotation: [-0.8, 0.3, -0.3], elbowBend: 1.3, wristRotation: [0, -0.3, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0, 0, -0.05],
      },
    ],
  },

  when: {
    word: 'when',
    poses: [
      {
        name: 'when-1', description: 'Index circles other index',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.4, wristRotation: [0, 0.3, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'point' },
      },
      {
        name: 'when-2', description: 'Land on fingertip',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.2, -0.2], elbowBend: 1.5, wristRotation: [0.3, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.4, wristRotation: [0, 0, 0], handShape: 'point' },
      },
    ],
  },

  why: {
    word: 'why',
    poses: [
      {
        name: 'why-1', description: 'Touch forehead, bring down to Y',
        duration: 500,
        rightArm: { shoulderRotation: [-1.3, 0.5, -0.4], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
        headTilt: [0.05, 0, 0.05],
      },
    ],
  },

  sign: {
    word: 'sign',
    poses: [
      {
        name: 'sign-1', description: 'Index fingers circle alternately',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.3, wristRotation: [0, 0.3, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.3, wristRotation: [0, -0.3, 0], handShape: 'point' },
      },
      {
        name: 'sign-2', description: 'Circle other direction',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.3, wristRotation: [0, -0.3, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.3, wristRotation: [0, 0.3, 0], handShape: 'point' },
      },
    ],
  },

  language: {
    word: 'language',
    poses: [
      {
        name: 'language-1', description: 'L hands pull apart',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.2, -0.2], elbowBend: 1.3, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.6, -0.2, 0.2], elbowBend: 1.3, wristRotation: [0, 0, 0], handShape: 'point' },
      },
      {
        name: 'language-2', description: 'Pull apart',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.5, -0.3], elbowBend: 1.1, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.6, -0.5, 0.3], elbowBend: 1.1, wristRotation: [0, 0, 0], handShape: 'point' },
      },
    ],
  },

  welcome: {
    word: 'welcome',
    poses: [
      {
        name: 'welcome-1', description: 'Open hand sweeps toward body',
        duration: 500,
        rightArm: { shoulderRotation: [-0.8, 0.5, -0.3], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'welcome-2', description: 'Bring toward body',
        duration: 500,
        rightArm: { shoulderRotation: [-0.5, 0.7, -0.3], elbowBend: 1.5, wristRotation: [-0.3, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  morning: {
    word: 'morning',
    poses: [
      {
        name: 'morning-1', description: 'Hand rises like sun',
        duration: 500,
        rightArm: { shoulderRotation: [-0.4, 0.3, -0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.3, -0.5, 0.3], elbowBend: 1.2, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'morning-2', description: 'Rise up',
        duration: 500,
        rightArm: { shoulderRotation: [-0.8, 0.3, -0.2], elbowBend: 1.0, wristRotation: [-0.3, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.3, -0.5, 0.3], elbowBend: 1.2, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  night: {
    word: 'night',
    poses: [
      {
        name: 'night-1', description: 'Curved hand over flat hand',
        duration: 500,
        rightArm: { shoulderRotation: [-0.8, 0.3, -0.2], elbowBend: 1.3, wristRotation: [1.0, 0, 0], handShape: 'claw' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  nice: {
    word: 'nice',
    poses: [
      {
        name: 'nice-1', description: 'One palm slides over other',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.3, -0.2], elbowBend: 1.2, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'nice-2', description: 'Slide forward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.2, -0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  slow: {
    word: 'slow',
    poses: [
      {
        name: 'slow-1', description: 'Hand slides up other hand slowly',
        duration: 600,
        rightArm: { shoulderRotation: [-0.5, 0.3, -0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'slow-2', description: 'Slide up slowly',
        duration: 600,
        rightArm: { shoulderRotation: [-0.8, 0.3, -0.2], elbowBend: 1.2, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.5, -0.3, 0.2], elbowBend: 1.0, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
    ],
  },

  fast: {
    word: 'fast',
    poses: [
      {
        name: 'fast-1', description: 'Index fingers pull back quickly',
        duration: 250,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.0, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.7, -0.3, 0.2], elbowBend: 1.0, wristRotation: [0, 0, 0], handShape: 'point' },
      },
      {
        name: 'fast-2', description: 'Snap back to fists',
        duration: 200,
        rightArm: { shoulderRotation: [-0.5, 0.5, -0.3], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'fist' },
        leftArm: { shoulderRotation: [-0.5, -0.5, 0.3], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'fist' },
      },
    ],
  },

  deaf: {
    word: 'deaf',
    poses: [
      {
        name: 'deaf-1', description: 'Point to ear',
        duration: 400,
        rightArm: { shoulderRotation: [-1.3, 0.6, -0.5], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'deaf-2', description: 'Point to mouth',
        duration: 400,
        rightArm: { shoulderRotation: [-1.3, 0.5, -0.3], elbowBend: 2.0, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  hearing: {
    word: 'hearing',
    poses: [
      {
        name: 'hearing-1', description: 'Index circles from mouth',
        duration: 500,
        rightArm: { shoulderRotation: [-1.2, 0.5, -0.3], elbowBend: 1.8, wristRotation: [0, 0.3, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  book: {
    word: 'book',
    poses: [
      {
        name: 'book-1', description: 'Palms together then open',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.2, -0.2], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.6, -0.2, 0.2], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'flat' },
      },
      {
        name: 'book-2', description: 'Open like a book',
        duration: 400,
        rightArm: { shoulderRotation: [-0.6, 0.5, -0.3], elbowBend: 1.2, wristRotation: [-0.8, 0, 0], handShape: 'flat' },
        leftArm: { shoulderRotation: [-0.6, -0.5, 0.3], elbowBend: 1.2, wristRotation: [-0.8, 0, 0], handShape: 'flat' },
      },
    ],
  },

  'come here': {
    word: 'come here',
    poses: [
      {
        name: 'comehere-1', description: 'Index finger beckons',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.2, wristRotation: [-0.5, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'comehere-2', description: 'Curl finger in',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.3, -0.2], elbowBend: 1.4, wristRotation: [-0.3, 0, 0], handShape: 'claw' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  look: {
    word: 'look',
    poses: [
      {
        name: 'look-1', description: 'V hand from eyes forward',
        duration: 400,
        rightArm: { shoulderRotation: [-1.2, 0.4, -0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
      {
        name: 'look-2', description: 'Point forward',
        duration: 400,
        rightArm: { shoulderRotation: [-0.8, 0.3, -0.2], elbowBend: 1.2, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  watch: {
    word: 'watch',
    poses: [
      {
        name: 'watch-1', description: 'V hand from eyes',
        duration: 500,
        rightArm: { shoulderRotation: [-1.2, 0.4, -0.3], elbowBend: 1.7, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  finish: {
    word: 'finish',
    poses: [
      {
        name: 'finish-1', description: 'Both hands shake out',
        duration: 300,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.3], elbowBend: 1.2, wristRotation: [0, 0.3, 0], handShape: 'open' },
        leftArm: { shoulderRotation: [-0.6, -0.4, 0.3], elbowBend: 1.2, wristRotation: [0, -0.3, 0], handShape: 'open' },
      },
      {
        name: 'finish-2', description: 'Shake other way',
        duration: 300,
        rightArm: { shoulderRotation: [-0.6, 0.4, -0.3], elbowBend: 1.2, wristRotation: [0, -0.3, 0], handShape: 'open' },
        leftArm: { shoulderRotation: [-0.6, -0.4, 0.3], elbowBend: 1.2, wristRotation: [0, 0.3, 0], handShape: 'open' },
      },
    ],
  },

  color: {
    word: 'color',
    poses: [
      {
        name: 'color-1', description: 'Wiggle fingers at chin',
        duration: 500,
        rightArm: { shoulderRotation: [-1.2, 0.5, -0.3], elbowBend: 1.8, wristRotation: [0, 0, 0], handShape: 'open' },
        leftArm: { ...REST_POSE.leftArm },
      },
    ],
  },

  time: {
    word: 'time',
    poses: [
      {
        name: 'time-1', description: 'Index taps wrist',
        duration: 400,
        rightArm: { shoulderRotation: [-0.7, 0.5, -0.3], elbowBend: 1.5, wristRotation: [0, 0, 0], handShape: 'point' },
        leftArm: { shoulderRotation: [-0.5, -0.5, 0.3], elbowBend: 1.3, wristRotation: [-0.5, 0, 0], handShape: 'fist' },
      },
    ],
  },
};