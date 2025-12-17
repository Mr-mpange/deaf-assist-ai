import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  MessageSquare,
  Users,
  Hand,
  Trash2,
  Eye
} from 'lucide-react';
import { SignDisplay } from '@/components/SignDisplay';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeacherMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'speech' | 'text';
}

interface StudentResponse {
  id: string;
  studentId: string;
  studentName: string;
  sign: string;
  confidence: number;
  timestamp: Date;
}

interface TeacherCommunicationPanelProps {
  sessionId: string;
  onStudentResponse?: (response: StudentResponse) => void;
  className?: string;
}

export function TeacherCommunicationPanel({ 
  sessionId, 
  onStudentResponse,
  className = "" 
}: TeacherCommunicationPanelProps) {
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isWaitingForResponses, setIsWaitingForResponses] = useState(false);
  const [showSignPreview, setShowSignPreview] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();



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
        setCurrentMessage(prev => prev + result.transcript + ' ');
      }
    },
    onError: (error) => {
      toast({
        title: "Speech Recognition Error",
        description: error,
        variant: "destructive",
      });
    }
  });

  // Listen for student responses
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`teacher-communication-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_responses',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newResponse = payload.new as any;
          const response: StudentResponse = {
            id: newResponse.id,
            studentId: newResponse.student_id,
            studentName: newResponse.student_name,
            sign: newResponse.sign,
            confidence: newResponse.confidence,
            timestamp: new Date(newResponse.created_at),
          };
          
          setStudentResponses(prev => [response, ...prev]);
          
          if (onStudentResponse) {
            onStudentResponse(response);
          }

          toast({
            title: "Student Response",
            description: `${response.studentName} signed: ${response.sign}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onStudentResponse, toast]);

  const sendMessage = async (text: string, type: 'speech' | 'text' = 'text') => {
    if (!text.trim()) return;

    const message: TeacherMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date(),
      type,
    };

    setMessages(prev => [message, ...prev]);

    // Broadcast message to students
    await supabase
      .from('teacher_messages')
      .insert({
        session_id: sessionId,
        message: text.trim(),
        message_type: type,
      });

    // Speak the message aloud
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }

    setCurrentMessage('');
    setIsWaitingForResponses(true);

    // Auto-stop waiting after 30 seconds
    setTimeout(() => {
      setIsWaitingForResponses(false);
    }, 30000);

    toast({
      title: "Message Sent",
      description: "Students can now respond with sign language",
    });
  };

  const handleSpeechSend = () => {
    if (currentMessage.trim()) {
      sendMessage(currentMessage, 'speech');
      clearTranscript();
    }
  };

  const handleTextSend = () => {
    if (currentMessage.trim()) {
      sendMessage(currentMessage, 'text');
    }
  };

  const clearResponses = () => {
    setStudentResponses([]);
    setIsWaitingForResponses(false);
  };

  const speakMessage = async (text: string) => {
    if (!text.trim()) {
      toast({
        title: "No Text",
        description: "Please enter text to speak",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous speech attempts
    if (isSpeaking) {
      console.log('🔇 Already speaking, ignoring request');
      return;
    }

    console.log('🔊 [TeacherPanel] SPEAKING:', text);

    if (!('speechSynthesis' in window)) {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in your browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSpeaking(true);
      
      // Stop any current speech
      speechSynthesis.cancel();
      
      // Wait a moment for cancellation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if voices are available
      const voices = speechSynthesis.getVoices();
      console.log('🎤 Available voices:', voices.length);
      console.log('🎤 Voice list:', voices.map(v => `${v.name} (${v.lang})`));
      
      if (voices.length === 0) {
        // Try to trigger voice loading
        speechSynthesis.getVoices();
        await new Promise(resolve => {
          if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
              console.log('🎤 Voices loaded after wait');
              resolve(undefined);
            };
          } else {
            setTimeout(resolve, 1000);
          }
        });
      }
      
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      // Get voices again after loading
      const availableVoices = speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        // Try different voice selection strategies
        let selectedVoice = availableVoices.find(voice => 
          voice.lang.includes('en-US') && voice.localService
        ) || availableVoices.find(voice => 
          voice.lang.includes('en') && voice.localService
        ) || availableVoices.find(voice => 
          voice.lang.includes('en-US')
        ) || availableVoices.find(voice => 
          voice.lang.includes('en')
        ) || availableVoices[0];
        
        utterance.voice = selectedVoice;
        console.log('🎤 Selected voice:', selectedVoice.name, selectedVoice.lang, 'Local:', selectedVoice.localService);
      } else {
        console.log('⚠️ No voices available, using default');
      }
      
      // Add timeout to detect if speech actually starts
      let speechStarted = false;
      const timeoutId = setTimeout(() => {
        if (!speechStarted) {
          console.log('⚠️ Speech timeout - no audio detected');
          setIsSpeaking(false);
          toast({
            title: "Audio Issue",
            description: "No sound detected. Check system volume and browser audio settings.",
            variant: "destructive",
          });
        }
      }, 3000);
      
      utterance.onstart = () => {
        speechStarted = true;
        clearTimeout(timeoutId);
        console.log('🎤 [TeacherPanel] SPEECH STARTED:', text);
        toast({
          title: "Speaking",
          description: "Playing text-to-speech...",
        });
      };
      
      utterance.onend = () => {
        clearTimeout(timeoutId);
        console.log('✅ [TeacherPanel] SPEECH ENDED:', text);
        setIsSpeaking(false);
      };
      
      utterance.onerror = (e) => {
        clearTimeout(timeoutId);
        console.error('❌ [TeacherPanel] SPEECH ERROR:', e.error);
        setIsSpeaking(false);
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          toast({
            title: "Speech Error",
            description: `Speech failed: ${e.error}. Try Chrome browser or check system audio.`,
            variant: "destructive",
          });
        }
      };
      
      console.log('🚀 [TeacherPanel] CALLING speechSynthesis.speak()');
      console.log('🔊 System audio check - speechSynthesis.speaking:', speechSynthesis.speaking);
      console.log('🔊 System audio check - speechSynthesis.pending:', speechSynthesis.pending);
      
      speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('💥 [TeacherPanel] Speech failed:', error);
      setIsSpeaking(false);
      toast({
        title: "Speech Failed",
        description: "Could not play text-to-speech",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`border-border/50 shadow-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Teacher Communication
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Speak or type to communicate with students. They can respond using sign language.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            placeholder="Type your message or use speech-to-text..."
            value={currentMessage + interimTranscript}
            onChange={(e) => setCurrentMessage(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {isSupported && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="sm"
                onClick={isListening ? stopListening : startListening}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Speech to Text
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => speakMessage(currentMessage)}
              disabled={!currentMessage.trim() || isSpeaking}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              {isSpeaking ? 'Speaking...' : 'Test Speech'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => speakMessage("Hello, this is a test")}
              disabled={isSpeaking}
            >
              🔊 Quick Test
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSignPreview(!showSignPreview)}
              disabled={!currentMessage.trim()}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Signs
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleTextSend}
              disabled={!currentMessage.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>

          {isListening && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              Listening... Speak now
            </div>
          )}

          {/* Sign Preview */}
          {showSignPreview && currentMessage.trim() && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2">Students will see these signs:</p>
              <SignDisplay text={currentMessage} />
            </div>
          )}
        </div>

        {/* Waiting for Responses */}
        {isWaitingForResponses && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hand className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Waiting for student responses...</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWaitingForResponses(false)}
              >
                Stop Waiting
              </Button>
            </div>
          </div>
        )}

        {/* Student Responses */}
        {studentResponses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Student Responses ({studentResponses.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearResponses}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {studentResponses.map((response) => (
                <div
                  key={response.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-sm">{response.studentName}</span>
                    <span className="mx-2 text-muted-foreground">signed:</span>
                    <Badge variant="secondary">{response.sign}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(response.confidence * 100)}% confidence
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Messages */}
        {messages.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Messages</h4>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {messages.slice(0, 5).map((message) => (
                <div
                  key={message.id}
                  className="p-2 bg-muted/30 rounded text-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={message.type === 'speech' ? 'default' : 'outline'} className="text-xs">
                      {message.type === 'speech' ? 'Speech' : 'Text'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}