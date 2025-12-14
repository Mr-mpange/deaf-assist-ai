// Simple test to check if MediaPipe can be imported
console.log('Testing MediaPipe import...');

async function testMediaPipe() {
  try {
    console.log('1. Attempting to import @mediapipe/hands...');
    const handsModule = await import('@mediapipe/hands');
    console.log('2. Import successful:', handsModule);
    
    console.log('3. Attempting to create Hands instance...');
    const hands = new handsModule.Hands({
      locateFile: (file) => {
        console.log('4. Locating file:', file);
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
    console.log('5. Hands instance created:', hands);
    
    console.log('6. Attempting to initialize...');
    await hands.initialize();
    console.log('7. SUCCESS! MediaPipe is working');
    
  } catch (error) {
    console.error('FAILED at step:', error);
  }
}

// Run the test
testMediaPipe();