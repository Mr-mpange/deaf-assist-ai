// Sign Language Dictionary - Maps words to sign descriptions and animations
export interface SignDefinition {
  word: string;
  category: 'alphabet' | 'number' | 'common' | 'phrase' | 'greeting' | 'question';
  description: string;
  handShape: string;
  movement: string;
  position: string;
  animationSteps: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export const signLanguageDictionary: Record<string, SignDefinition> = {
  // Greetings
  'hello': {
    word: 'hello',
    category: 'greeting',
    description: 'Open hand, palm facing forward, wave side to side',
    handShape: 'Open palm, fingers extended',
    movement: 'Wave side to side',
    position: 'Shoulder height, in front of body',
    animationSteps: [
      'Raise right hand to shoulder height',
      'Open palm facing forward',
      'Wave hand side to side 2-3 times',
      'Smile while signing'
    ]
  },
  'hi': {
    word: 'hi',
    category: 'greeting',
    description: 'Same as hello - open hand wave',
    handShape: 'Open palm, fingers extended',
    movement: 'Wave side to side',
    position: 'Shoulder height, in front of body',
    animationSteps: [
      'Raise right hand to shoulder height',
      'Open palm facing forward',
      'Wave hand side to side 2-3 times'
    ]
  },
  'goodbye': {
    word: 'goodbye',
    category: 'greeting',
    description: 'Open hand, palm down, wave fingers up and down',
    handShape: 'Open palm, fingers extended',
    movement: 'Fingers wave up and down',
    position: 'Shoulder height, palm facing down',
    animationSteps: [
      'Raise right hand to shoulder height',
      'Turn palm facing down',
      'Wave fingers up and down like saying bye to a baby',
      'Repeat 2-3 times'
    ]
  },
  'bye': {
    word: 'bye',
    category: 'greeting',
    description: 'Same as goodbye',
    handShape: 'Open palm, fingers extended',
    movement: 'Fingers wave up and down',
    position: 'Shoulder height, palm facing down',
    animationSteps: [
      'Raise right hand to shoulder height',
      'Turn palm facing down',
      'Wave fingers up and down',
      'Repeat 2-3 times'
    ]
  },

  // Common Words
  'please': {
    word: 'please',
    category: 'common',
    description: 'Flat hand on chest, circular motion',
    handShape: 'Flat hand, fingers together',
    movement: 'Circular motion on chest',
    position: 'Center of chest',
    animationSteps: [
      'Place flat right hand on center of chest',
      'Keep fingers together and straight',
      'Make circular motion clockwise',
      'Repeat 2-3 times'
    ]
  },
  'thank': {
    word: 'thank',
    category: 'common',
    description: 'Flat hand from chin moving forward',
    handShape: 'Flat hand, fingers together',
    movement: 'Move from chin outward',
    position: 'Start at chin, move forward',
    animationSteps: [
      'Place flat right hand near chin',
      'Fingers pointing up, palm facing left',
      'Move hand forward and slightly down',
      'End with palm facing up'
    ]
  },
  'you': {
    word: 'you',
    category: 'common',
    description: 'Point with index finger',
    handShape: 'Index finger extended, others closed',
    movement: 'Point directly at person',
    position: 'Arm extended toward person',
    animationSteps: [
      'Make fist with right hand',
      'Extend index finger',
      'Point directly at the person',
      'Hold for 1-2 seconds'
    ]
  },
  'me': {
    word: 'me',
    category: 'common',
    description: 'Point to yourself with index finger',
    handShape: 'Index finger extended, others closed',
    movement: 'Point to own chest',
    position: 'Point to center of chest',
    animationSteps: [
      'Make fist with right hand',
      'Extend index finger',
      'Point to center of your chest',
      'Hold for 1-2 seconds'
    ]
  },

  // Questions
  'what': {
    word: 'what',
    category: 'question',
    description: 'Index fingers wiggle side to side',
    handShape: 'Both index fingers extended',
    movement: 'Wiggle side to side',
    position: 'In front of body, shoulder height',
    animationSteps: [
      'Extend both index fingers',
      'Hold hands in front of body',
      'Wiggle fingers side to side',
      'Furrow eyebrows (question expression)'
    ]
  },
  'where': {
    word: 'where',
    category: 'question',
    description: 'Index finger shake side to side',
    handShape: 'Index finger extended',
    movement: 'Shake side to side',
    position: 'Shoulder height, in front of body',
    animationSteps: [
      'Extend right index finger',
      'Hold at shoulder height',
      'Shake finger side to side quickly',
      'Questioning facial expression'
    ]
  },
  'when': {
    word: 'when',
    category: 'question',
    description: 'Index finger circles around other index finger',
    handShape: 'Both index fingers extended',
    movement: 'One circles around the other',
    position: 'In front of body',
    animationSteps: [
      'Extend both index fingers',
      'Hold left finger steady',
      'Circle right finger around left finger',
      'Complete one full circle'
    ]
  },
  'how': {
    word: 'how',
    category: 'question',
    description: 'Knuckles together, fingers curl up',
    handShape: 'Curved hands, knuckles touching',
    movement: 'Fingers curl upward together',
    position: 'In front of body, waist level',
    animationSteps: [
      'Make loose fists with both hands',
      'Place knuckles together',
      'Curl fingers upward simultaneously',
      'Questioning expression'
    ]
  },

  // Numbers 1-10
  'one': {
    word: 'one',
    category: 'number',
    description: 'Index finger up',
    handShape: 'Index finger extended, others closed',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Make fist with right hand',
      'Extend index finger upward',
      'Keep other fingers closed',
      'Hold steady'
    ]
  },
  'two': {
    word: 'two',
    category: 'number',
    description: 'Index and middle fingers up (V shape)',
    handShape: 'Index and middle fingers extended',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Make fist with right hand',
      'Extend index and middle fingers',
      'Form V shape',
      'Keep other fingers closed'
    ]
  },
  'three': {
    word: 'three',
    category: 'number',
    description: 'Thumb, index, and middle fingers up',
    handShape: 'Thumb, index, middle fingers extended',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Extend thumb, index, and middle fingers',
      'Keep ring and pinky fingers closed',
      'Hold hand upright',
      'Display clearly'
    ]
  },
  'four': {
    word: 'four',
    category: 'number',
    description: 'Four fingers up, thumb closed',
    handShape: 'Four fingers extended, thumb closed',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Extend index, middle, ring, and pinky fingers',
      'Keep thumb closed against palm',
      'Hold hand upright',
      'Display clearly'
    ]
  },
  'five': {
    word: 'five',
    category: 'number',
    description: 'All five fingers extended',
    handShape: 'All fingers extended and spread',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Extend all five fingers',
      'Spread fingers apart',
      'Hold hand upright',
      'Display clearly'
    ]
  },

  // Alphabet (key letters)
  'a': {
    word: 'a',
    category: 'alphabet',
    description: 'Fist with thumb to the side',
    handShape: 'Closed fist, thumb beside index finger',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Make a fist with right hand',
      'Place thumb beside index finger',
      'Keep fist upright',
      'Hold steady'
    ]
  },
  'b': {
    word: 'b',
    category: 'alphabet',
    description: 'Flat hand, fingers up, thumb across palm',
    handShape: 'Four fingers up, thumb across palm',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Extend four fingers upward',
      'Keep fingers together',
      'Place thumb across palm',
      'Hold hand upright'
    ]
  },
  'c': {
    word: 'c',
    category: 'alphabet',
    description: 'Curved hand like holding a cup',
    handShape: 'Curved fingers and thumb',
    movement: 'Hold steady',
    position: 'In front of body',
    animationSteps: [
      'Curve all fingers and thumb',
      'Form C shape like holding a cup',
      'Keep consistent curve',
      'Hold steady'
    ]
  },

  // Common Phrases
  'good': {
    word: 'good',
    category: 'common',
    description: 'Flat hand from chin to other hand',
    handShape: 'Flat hand, fingers together',
    movement: 'From chin to other palm',
    position: 'Start at chin, end at other palm',
    animationSteps: [
      'Place flat right hand near chin',
      'Move hand down to left palm',
      'End with right hand on left palm',
      'Both palms facing up'
    ]
  },
  'bad': {
    word: 'bad',
    category: 'common',
    description: 'Flat hand from chin, flip down',
    handShape: 'Flat hand, fingers together',
    movement: 'From chin, flip palm down',
    position: 'Start at chin, flip outward',
    animationSteps: [
      'Place flat right hand near chin',
      'Move hand away from chin',
      'Flip palm to face down',
      'End with palm facing down'
    ]
  },
  'yes': {
    word: 'yes',
    category: 'common',
    description: 'Fist nods up and down',
    handShape: 'Closed fist',
    movement: 'Nod up and down',
    position: 'In front of body',
    animationSteps: [
      'Make fist with right hand',
      'Hold at shoulder height',
      'Nod fist up and down',
      'Repeat 2-3 times like nodding head'
    ]
  },
  'no': {
    word: 'no',
    category: 'common',
    description: 'Index and middle finger snap to thumb',
    handShape: 'Index, middle finger, and thumb',
    movement: 'Snap fingers to thumb',
    position: 'In front of body',
    animationSteps: [
      'Extend index and middle fingers',
      'Extend thumb',
      'Snap fingers down to touch thumb',
      'Like a mouth closing'
    ]
  }
};

// Function to find signs for a sentence
export function findSignsInText(text: string): SignDefinition[] {
  const words = text.toLowerCase().split(/\s+/);
  const foundSigns: SignDefinition[] = [];
  
  words.forEach(word => {
    // Remove punctuation
    const cleanWord = word.replace(/[^\w]/g, '');
    
    if (signLanguageDictionary[cleanWord]) {
      foundSigns.push(signLanguageDictionary[cleanWord]);
    }
  });
  
  return foundSigns;
}

// Function to get sign by word
export function getSignForWord(word: string): SignDefinition | null {
  const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
  return signLanguageDictionary[cleanWord] || null;
}