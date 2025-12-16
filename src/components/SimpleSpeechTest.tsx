import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export function SimpleSpeechTest() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  const startListening = () => {
    console.log('Checking speech recognition support...');
    console.log('SpeechRecognition:', (window as any).SpeechRecognition);
    console.log('webkitSpeechRecognition:', (window as any).webkitSpeechRecognition);
    console.log('Protocol:', window.location.protocol);
    console.log('Host:', window.location.hostname);
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(`Speech recognition not supported. 
      
Current browser: ${navigator.userAgent}
Protocol: ${window.location.protocol}
Host: ${window.location.hostname}

Requirements:
- Use Chrome, Edge, or Safari
- Must be HTTPS (or localhost)
- Allow microphone permissions`);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    // Simple configuration - no grammars
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';
    
    recognitionInstance.onstart = () => {
      setIsListening(true);
      console.log('Speech recognition started');
    };
    
    recognitionInstance.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      console.log('Speech result:', result);
    };
    
    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognitionInstance.onend = () => {
      setIsListening(false);
      console.log('Speech recognition ended');
    };
    
    setRecognition(recognitionInstance);
    recognitionInstance.start();
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const testSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance('Hello! This is a test of text to speech. Can you hear me clearly?');
    utterance.rate = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    
    speechSynthesis.cancel(); // Stop any ongoing speech
    speechSynthesis.speak(utterance);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Simple Speech Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            className="flex-1"
          >
            {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            {isListening ? "Stop Listening" : "Start Listening"}
          </Button>
          
          <Button variant="outline" onClick={testSpeech}>
            <Volume2 className="w-4 h-4 mr-2" />
            Test Speech
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isListening ? "default" : "outline"}>
            {isListening ? "Listening..." : "Ready"}
          </Badge>
        </div>

        {transcript && (
          <div className="p-3 bg-primary/10 rounded border">
            <p className="text-sm font-medium">You said:</p>
            <p className="text-lg">{transcript}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-2">
          <div>
            <p><strong>Instructions:</strong></p>
            <p>1. Click "Start Listening" and speak clearly</p>
            <p>2. Click "Test Speech" to hear text-to-speech</p>
            <p>3. Make sure your microphone is working and unmuted</p>
          </div>
          
          <div>
            <p><strong>Browser Support:</strong></p>
            <p>• Protocol: {window.location.protocol}</p>
            <p>• SpeechRecognition: {(window as any).SpeechRecognition ? '✅' : '❌'}</p>
            <p>• webkitSpeechRecognition: {(window as any).webkitSpeechRecognition ? '✅' : '❌'}</p>
            <p>• speechSynthesis: {'speechSynthesis' in window ? '✅' : '❌'}</p>
          </div>
          
          {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-yellow-800 font-medium">⚠️ HTTPS Required</p>
              <p className="text-yellow-700">Speech recognition requires HTTPS in production. Currently on {window.location.protocol}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}