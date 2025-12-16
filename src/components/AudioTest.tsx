import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, AlertTriangle } from 'lucide-react';

export function AudioTest() {
  const [isPlaying, setIsPlaying] = useState(false);

  const playBeep = () => {
    try {
      // Create audio context for beep test
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800 Hz beep
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5); // 0.5 second beep
      
      console.log('🔊 Playing beep test');
    } catch (error) {
      console.error('Beep test failed:', error);
      alert('Audio context failed. Your browser may not support Web Audio API.');
    }
  };

  const testSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported');
      return;
    }

    setIsPlaying(true);
    
    // Cancel any existing speech
    speechSynthesis.cancel();
    
    // Wait a moment then try speech
    setTimeout(() => {
      const text = 'Testing audio. Can you hear this?';
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Basic settings
      utterance.volume = 1.0;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => {
        console.log('✅ Speech started');
      };
      
      utterance.onend = () => {
        console.log('✅ Speech ended');
        setIsPlaying(false);
      };
      
      utterance.onerror = (e) => {
        console.error('❌ Speech error:', e.error);
        setIsPlaying(false);
      };
      
      console.log('🔊 Attempting speech...');
      speechSynthesis.speak(utterance);
      
      // Force retry if needed
      setTimeout(() => {
        if (!speechSynthesis.speaking) {
          console.log('🔄 Retrying speech...');
          speechSynthesis.speak(utterance);
        }
      }, 200);
      
    }, 100);
  };

  const stopSpeech = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Audio System Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={playBeep} variant="outline" className="flex-1">
            <Volume2 className="w-4 h-4 mr-2" />
            Test Beep
          </Button>
          
          <Button 
            onClick={isPlaying ? stopSpeech : testSpeech}
            variant={isPlaying ? "destructive" : "default"}
            className="flex-1"
          >
            {isPlaying ? (
              <>
                <VolumeX className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Test Speech
              </>
            )}
          </Button>
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">If you can't hear anything:</p>
              <ul className="text-yellow-700 mt-1 space-y-1">
                <li>• Check system volume (Windows volume mixer)</li>
                <li>• Check browser tab isn't muted (speaker icon on tab)</li>
                <li>• Try headphones/different speakers</li>
                <li>• Test with YouTube or other audio first</li>
                <li>• Try Chrome browser</li>
                <li>• Click multiple times</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Browser Audio Status:</strong></p>
          <p>• AudioContext: {window.AudioContext || (window as any).webkitAudioContext ? '✅' : '❌'}</p>
          <p>• SpeechSynthesis: {'speechSynthesis' in window ? '✅' : '❌'}</p>
          <p>• Voices Available: {speechSynthesis.getVoices().length}</p>
          <p>• Currently Speaking: {speechSynthesis.speaking ? '✅' : '❌'}</p>
        </div>
      </CardContent>
    </Card>
  );
}