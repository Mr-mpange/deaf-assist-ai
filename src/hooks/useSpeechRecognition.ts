import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionProps {
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: string;
}

export function useSpeechRecognition({
  onResult,
  onError,
  continuous = true,
  language = 'en-US'
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔍 Checking speech recognition support...');
    
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      console.log('✅ Speech recognition supported');
      setIsSupported(true);
      
      try {
        const recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('🎤 Speech recognition started successfully');
          setIsListening(true);
          toast({
            title: "Listening",
            description: "Speak now...",
          });
        };

        recognition.onresult = (event: any) => {
          console.log('📝 Speech recognition result received');
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            console.log('🗣️ Final transcript:', finalTranscript);
            setTranscript(prev => prev + finalTranscript);
            
            if (onResult) {
              onResult({
                transcript: finalTranscript,
                confidence: event.results[event.results.length - 1][0].confidence || 0.9,
                isFinal: true
              });
            }
          }

          if (interimTranscript) {
            console.log('⏳ Interim transcript:', interimTranscript);
            setInterimTranscript(interimTranscript);
            
            if (onResult) {
              onResult({
                transcript: interimTranscript,
                confidence: 0.5,
                isFinal: false
              });
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error);
          setIsListening(false);
          
          const errorMessage = getErrorMessage(event.error);
          if (onError) {
            onError(errorMessage);
          }
          
          toast({
            title: "Speech Recognition Error",
            description: errorMessage,
            variant: "destructive",
          });
        };

        recognition.onend = () => {
          console.log('🔇 Speech recognition ended');
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
        console.log('✅ Speech recognition initialized');
        
      } catch (error) {
        console.error('💥 Failed to create speech recognition:', error);
        setIsSupported(false);
        toast({
          title: "Speech Recognition Error",
          description: "Failed to initialize speech recognition",
          variant: "destructive",
        });
      }
    } else {
      console.warn('❌ Speech recognition not supported in this browser');
      setIsSupported(false);
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping speech recognition:', error);
        }
      }
    };
  }, [continuous, language, onResult, onError, toast]);

  const startListening = useCallback(async () => {
    console.log('🎯 Attempting to start speech recognition...');
    
    if (!isSupported) {
      console.error('❌ Speech recognition not supported');
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      console.log('⚠️ Already listening');
      return;
    }

    // Check microphone permissions first
    try {
      console.log('🎤 Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
    } catch (permError) {
      console.error('❌ Microphone permission denied:', permError);
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to use speech recognition.",
        variant: "destructive",
      });
      return;
    }

    if (recognitionRef.current) {
      try {
        console.log('🚀 Starting speech recognition...');
        recognitionRef.current.start();
      } catch (error) {
        console.error('💥 Failed to start speech recognition:', error);
        toast({
          title: "Speech Recognition Error",
          description: "Could not start speech recognition. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.error('❌ Speech recognition not initialized');
      toast({
        title: "Error",
        description: "Speech recognition not properly initialized.",
        variant: "destructive",
      });
    }
  }, [isSupported, isListening, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech detected. Please try speaking again.';
    case 'audio-capture':
      return 'Microphone not accessible. Please check permissions.';
    case 'not-allowed':
      return 'Microphone permission denied. Please allow microphone access.';
    case 'network':
      return 'Network error occurred during speech recognition.';
    case 'service-not-allowed':
      return 'Speech recognition service not allowed.';
    default:
      return `Speech recognition error: ${error}`;
  }
}