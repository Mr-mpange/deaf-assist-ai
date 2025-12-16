import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX } from 'lucide-react';

export function TextToSpeechTest() {
  const [text, setText] = useState('Hello! This is a test of text to speech. Can you hear me clearly?');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech not supported in this browser');
      return;
    }

    // Stop any ongoing speech
    speechSynthesis.cancel();
    
    if (!textToSpeak.trim()) {
      return;
    }

    console.log('🔊 ATTEMPTING TO SPEAK:', textToSpeak);
    console.log('🔊 System volume check - make sure your speakers/headphones are on');
    
    setIsSpeaking(true);
    
    // Wait for voices to load if needed
    const performSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Configure speech with more aggressive settings
      utterance.rate = 0.8;  // Slower rate
      utterance.pitch = 1.0;
      utterance.volume = 1.0; // Maximum volume
      utterance.lang = 'en-US';
      
      // Get available voices
      const voices = speechSynthesis.getVoices();
      console.log('🔊 Available voices:', voices.length);
      
      if (voices.length > 0) {
        // Try to find the best voice
        let selectedVoice = voices.find(voice => 
          voice.lang.includes('en-US') && voice.localService
        ) || voices.find(voice => 
          voice.lang.includes('en-US')
        ) || voices.find(voice => 
          voice.lang.includes('en') && voice.localService
        ) || voices.find(voice => 
          voice.lang.includes('en')
        ) || voices[0];
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('🔊 Using voice:', selectedVoice.name, selectedVoice.lang);
        }
      } else {
        console.warn('🔊 No voices available, using default');
      }
      
      utterance.onstart = () => {
        console.log('🎤 SPEECH STARTED:', textToSpeak);
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('✅ SPEECH ENDED');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (e) => {
        console.error('❌ SPEECH ERROR:', e.error);
        setIsSpeaking(false);
        alert(`Speech error: ${e.error}\n\nTry:\n1. Check system volume\n2. Try different browser\n3. Check if other audio works`);
      };
      
      utterance.onpause = () => console.log('⏸️ SPEECH PAUSED');
      utterance.onresume = () => console.log('▶️ SPEECH RESUMED');
      
      console.log('🚀 CALLING speechSynthesis.speak()');
      speechSynthesis.speak(utterance);
      
      // Multiple retry attempts for different browsers
      setTimeout(() => {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          console.log('🔄 First retry - speech may have failed silently');
          speechSynthesis.speak(utterance);
        }
      }, 100);
      
      setTimeout(() => {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          console.log('🔄 Second retry - trying to force speech');
          speechSynthesis.cancel();
          speechSynthesis.speak(utterance);
        }
      }, 500);
      
      // Final check after 2 seconds
      setTimeout(() => {
        console.log('📊 Final speech status:', {
          speaking: speechSynthesis.speaking,
          pending: speechSynthesis.pending,
          paused: speechSynthesis.paused
        });
        
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          setIsSpeaking(false);
          alert('Speech may have failed silently. Check:\n\n1. System volume is up\n2. Speakers/headphones connected\n3. Other audio works\n4. Try Chrome browser\n5. Try clicking multiple times');
        }
      }, 2000);
    };
    
    // Wait for voices to load if needed
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        performSpeak();
        speechSynthesis.onvoiceschanged = null;
      };
    } else {
      performSpeak();
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const testPhrases = [
    'Hello! This is a test of text to speech.',
    'The quick brown fox jumps over the lazy dog.',
    'Welcome to the deaf learning platform.',
    'Sign language is a beautiful form of communication.',
    'Can you hear this message clearly?'
  ];

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Text-to-Speech Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="speech-text">Text to Speak:</Label>
          <Input
            id="speech-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to speak..."
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => speak(text)}
            disabled={isSpeaking || !text.trim()}
            className="flex-1"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            {isSpeaking ? 'Speaking...' : 'Speak Text'}
          </Button>
          
          {isSpeaking && (
            <Button variant="destructive" onClick={stopSpeaking}>
              <VolumeX className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label>Quick Test Phrases:</Label>
          <div className="grid grid-cols-1 gap-1">
            {testPhrases.map((phrase, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => speak(phrase)}
                disabled={isSpeaking}
                className="text-left justify-start text-xs"
              >
                {phrase}
              </Button>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Status:</strong></p>
          <p>• Text-to-Speech: {'speechSynthesis' in window ? '✅ Supported' : '❌ Not Supported'}</p>
          <p>• Available Voices: {speechSynthesis.getVoices().length}</p>
          <p>• Currently Speaking: {speechSynthesis.speaking ? '✅ Yes' : '❌ No'}</p>
          
          {speechSynthesis.speaking && !isSpeaking && (
            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded mt-2">
              <p className="text-yellow-800 font-medium">⚠️ Speech Status Mismatch</p>
              <p className="text-yellow-700">Browser says it's speaking but you may not hear it. Check system volume!</p>
            </div>
          )}
          
          {!('speechSynthesis' in window) && (
            <div className="p-2 bg-red-100 border border-red-300 rounded mt-2">
              <p className="text-red-800 font-medium">❌ Text-to-Speech Not Supported</p>
              <p className="text-red-700">Your browser doesn't support text-to-speech</p>
            </div>
          )}
          
          {isSpeaking && (
            <div className="p-2 bg-blue-100 border border-blue-300 rounded mt-2">
              <p className="text-blue-800 font-medium">🔊 If you can't hear anything:</p>
              <p className="text-blue-700">1. Check Windows volume mixer 2. Unmute browser tab 3. Try headphones 4. Test other audio first</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}