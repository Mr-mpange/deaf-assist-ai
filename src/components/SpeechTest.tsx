import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export function SpeechTest() {
  const [results, setResults] = useState<string[]>([]);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition({
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
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Hello, this is a test of text to speech');
      speechSynthesis.speak(utterance);
    }
  };

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

        <div className="flex gap-2">
          <Button
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button variant="outline" onClick={clearTranscript}>
            Clear
          </Button>
          <Button variant="outline" onClick={testSpeech}>
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>

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
      </CardContent>
    </Card>
  );
}