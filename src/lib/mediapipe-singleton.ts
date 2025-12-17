// Singleton MediaPipe instance to prevent multiple initializations
let mediapipeInstance: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

export async function getMediaPipeInstance() {
  // Return existing instance if available
  if (mediapipeInstance) {
    console.log('♻️ Reusing existing MediaPipe instance');
    return mediapipeInstance;
  }

  // Wait for ongoing initialization
  if (isInitializing && initPromise) {
    console.log('⏳ Waiting for MediaPipe initialization...');
    return initPromise;
  }

  // Start new initialization
  isInitializing = true;
  initPromise = initializeMediaPipe();
  
  try {
    mediapipeInstance = await initPromise;
    return mediapipeInstance;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

async function initializeMediaPipe() {
  console.log('🚀 Initializing MediaPipe singleton...');

  // Load MediaPipe script if not already loaded
  if (!(window as any).Hands) {
    await loadMediaPipeScript();
  }

  const Hands = (window as any).Hands;
  const hands = new Hands({
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

  await hands.initialize();
  console.log('✅ MediaPipe singleton initialized!');
  
  return hands;
}

function loadMediaPipeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).Hands) {
      resolve();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="mediapipe/hands"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load MediaPipe script'));
    document.head.appendChild(script);
  });
}

export function resetMediaPipeInstance() {
  if (mediapipeInstance) {
    try {
      mediapipeInstance.close();
    } catch (err) {
      console.error('Error closing MediaPipe:', err);
    }
    mediapipeInstance = null;
  }
}
