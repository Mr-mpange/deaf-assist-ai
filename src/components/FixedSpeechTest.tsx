import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX, AlertCircle } from 'lucide-react';

export function FixedSpeechTest() {
  const [text, setText] = useState('Hello! Can you hear me clearly?');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech not supported in this browser');
      return;
    }

    if (!textToSpeak.trim()) {
      return;
    }

    console.log('🔊 FIXED SPEECH TEST - Starting:', textToSpeak);
    setLastError('');
    
    // IMPORTANT: Stop everything first and wait
    speechSynthesis.cancel();
    
    // Wait for cancel to complete
    setTimeout(() => {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utteranceRef.current = utterance;
      
      // Simple, reliable settings
      utterance.volume = 1.0;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      
      // Don't try to be smart about voices - use default
      console.log('🔊 Using default voice for reliability');
      
      utterance.onstart = () => {
        console.log('✅ SPEECH ACTUALLY STARTED');
        setIsSpeaking(true);
        setLastError('');
      };
      
      utterance.onend = () => {
        console.log('✅ SPEECH COMPLETED');
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      
      utterance.onerror = (e) => {
        console.error('❌ SPEECH ERROR:', e.error);
        setLastError(e.error);
        setIsSpeaking(false);
        utteranceRef.current = null;
        
        if (e.error === 'interrupted') {
          console.log('🔄 Speech was interrupted - this is common');
        }
      };
      
      // Speak with single attempt - no retries to avoid conflicts
      console.log('🚀 Speaking with fixed method...');
      speechSynthesis.speak(utterance);
      
    }, 250); // Wait 250ms for cancel to complete
  };

  const stopSpeaking = () => {
    console.log('🛑 Stopping speech...');
    speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  };

  const testSystemAudio = () => {
    // Test if system audio works at all
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A note
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
      
      console.log('🔊 System audio test - beep played');
    } catch (error) {
      console.error('System audio test failed:', error);
      alert('System audio test failed. Check if audio works in other apps.');
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Fixed Speech Test
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
            {isSpeaking ? 'Speaking...' : 'Speak (Fixed)'}
          </Button>
          
          <Button variant="outline" onClick={testSystemAudio}>
            🔊 Beep
          </Button>
          
          {isSpeaking && (
            <Button variant="destructive" onClick={stopSpeaking}>
              <VolumeX className="w-4 h-4" />
            </Button>
          )}
        </div>

        {lastError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 font-medium">Speech Error: {lastError}</span>
            </div>
            {lastError === 'interrupted' && (
              <p className="text-red-700 text-sm mt-1">
                Speech was interrupted. Try waiting a moment and clicking again.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => speak('Test one two three')}
            disabled={isSpeaking}
          >
            Quick Test 1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => speak('Hello world')}
            disabled={isSpeaking}
          >
            Quick Test 2
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Status:</strong></p>
          <p>• Speaking: {speechSynthesis.speaking ? '✅ Yes' : '❌ No'}</p>
          <p>• Pending: {speechSynthesis.pending ? '✅ Yes' : '❌ No'}</p>
          <p>• Available Voices: {speechSynthesis.getVoices().length}</p>
          
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 font-medium text-sm">💡 Troubleshooting Tips:</p>
            <ul className="text-blue-700 text-xs mt-1 space-y-1">
              <li>1. Try the "Beep" button first - if no sound, check system audio</li>
              <li>2. If beep works but speech doesn't, try Chrome browser</li>
              <li>3. Check Windows volume mixer - unmute browser</li>
              <li>4. Wait between clicks to avoid "interrupted" errors</li>
              <li>5. Try headphones if speakers don't work</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}