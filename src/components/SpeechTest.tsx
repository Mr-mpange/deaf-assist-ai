import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, Activity } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export function SpeechTest() {
  const [results, setResults] = useState<string[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition({
    continuous: true,
    onResult: (result) => {
      if (result.isFinal) {
        setResults(prev => [...prev, result.transcript]);
      }
    },
    onError: (error) => {
      console.error('Speech error:', error);
    }
  });

  const testSpeech = () => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const text = 'Hello, this is a test of text to speech. Can you hear me?';
      console.log('🔊 Testing speech:', text);
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure for better compatibility
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      // Get available voices
      const voices = speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      
      if (voices.length > 0) {
        // Try to find a good English voice
        const englishVoice = voices.find(voice => 
          voice.lang.includes('en') && voice.localService
        ) || voices.find(voice => 
          voice.lang.includes('en')
        ) || voices[0];
        
        if (englishVoice) {
          utterance.voice = englishVoice;
          console.log('Using voice:', englishVoice.name, englishVoice.lang);
        }
      }
      
      utterance.onstart = () => console.log('✅ Speech started');
      utterance.onend = () => console.log('✅ Speech ended');
      utterance.onerror = (e) => console.error('❌ Speech error:', e.error);
      
      speechSynthesis.speak(utterance);
      
      // Debug info
      setTimeout(() => {
        console.log('Speech status:', {
          speaking: speechSynthesis.speaking,
          pending: speechSynthesis.pending,
          paused: speechSynthesis.paused
        });
      }, 500);
      
    } catch (error) {
      console.error('Speech test failed:', error);
    }
  };

  const testMicrophone = async () => {
    if (isTesting) {
      // Stop testing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsTesting(false);
      setMicLevel(0);
      return;
    }

    try {
      setIsTesting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current || !isTesting) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setMicLevel(Math.round(average));
        
        if (isTesting) {
          requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      setIsTesting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Speech Recognition Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isSupported ? "default" : "destructive"}>
            {isSupported ? "Supported" : "Not Supported"}
          </Badge>
          <Badge variant={isListening ? "default" : "outline"}>
            {isListening ? "Listening" : "Stopped"}
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? "Stop" : "Listen"}
          </Button>
          <Button 
            variant={isTesting ? "destructive" : "outline"} 
            onClick={testMicrophone}
          >
            <Activity className="w-4 h-4" />
            {isTesting ? "Stop Test" : "Test Mic"}
          </Button>
          <Button variant="outline" onClick={clearTranscript}>
            Clear
          </Button>
          <Button variant="outline" onClick={testSpeech}>
            <Volume2 className="w-4 h-4" />
            Test Speech
          </Button>
        </div>

        {isTesting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Mic Level:</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-100 ${
                    micLevel > 20 ? 'bg-green-500' : micLevel > 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(micLevel * 2, 100)}%` }}
                />
              </div>
              <span className="text-sm w-8">{micLevel}</span>
            </div>
            <div className="text-xs space-y-1">
              {micLevel === 0 && (
                <p className="text-red-600">
                  No audio detected. Speak LOUDLY or check microphone permissions.
                </p>
              )}
              {micLevel > 0 && micLevel <= 10 && (
                <p className="text-yellow-600">
                  Very low audio. For built-in PC mics, speak MUCH louder and get closer.
                </p>
              )}
              {micLevel > 10 && micLevel <= 20 && (
                <p className="text-yellow-600">
                  Low audio detected. Try speaking louder for better speech recognition.
                </p>
              )}
              {micLevel > 20 && (
                <p className="text-green-600">
                  Good audio level! Speech recognition should work well.
                </p>
              )}
            </div>
          </div>
        )}

        {interimTranscript && (
          <div className="p-2 bg-muted/50 rounded text-sm">
            <span className="text-muted-foreground">Interim: </span>
            {interimTranscript}
          </div>
        )}

        {transcript && (
          <div className="p-2 bg-primary/10 rounded text-sm">
            <span className="font-medium">Final: </span>
            {transcript}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Results:</p>
            {results.map((result, index) => (
              <div key={index} className="p-2 bg-muted rounded text-sm">
                {result}
              </div>
            ))}
          </div>
        )}

        {!isSupported && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm space-y-2">
            <p className="font-medium text-destructive">Speech Recognition Not Supported</p>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Current Status:</strong></p>
              <p>• Protocol: {window.location.protocol}</p>
              <p>• Host: {window.location.hostname}</p>
              <p>• Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : navigator.userAgent.includes('Edge') ? 'Edge' : 'Unknown'}</p>
              <p>• SpeechRecognition: {(window as any).SpeechRecognition ? 'Available' : 'Not Available'}</p>
              <p>• webkitSpeechRecognition: {(window as any).webkitSpeechRecognition ? 'Available' : 'Not Available'}</p>
            </div>
            <div className="text-muted-foreground space-y-1">
              <p><strong>Requirements:</strong></p>
              <p>• Use Chrome, Edge, or Safari browser</p>
              <p>• Must be HTTPS (or localhost for testing)</p>
              <p>• Allow microphone permissions</p>
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  );
}