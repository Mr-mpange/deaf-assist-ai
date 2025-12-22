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

// Supported languages for speech recognition
export const SUPPORTED_LANGUAGES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'sw-KE': 'Swahili (Kenya)',
  'sw-TZ': 'Swahili (Tanzania)',
  'sw': 'Swahili',
  'ar-SA': 'Arabic (Saudi Arabia)',
  'fr-FR': 'French (France)',
  'es-ES': 'Spanish (Spain)',
  'de-DE': 'German (Germany)',
  'it-IT': 'Italian (Italy)',
  'pt-BR': 'Portuguese (Brazil)',
  'ru-RU': 'Russian (Russia)',
  'zh-CN': 'Chinese (Mandarin)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'hi-IN': 'Hindi (India)',
};

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
  const lastFinalTranscriptRef = useRef<string>('');
  const shouldContinueRef = useRef<boolean>(false); // Track if we want continuous listening
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
        
        // Configure recognition with better settings for continuous listening
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1; // Use 1 for better performance
        
        // Additional settings for better continuous recognition
        if (recognition.serviceURI) {
          recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
        }
        
        // Don't set grammars - it causes errors in some browsers
        // Additional settings are handled by the browser automatically

        recognition.onstart = () => {
          console.log('🎤 Speech recognition started successfully');
          setIsListening(true);
          toast({
            title: "Listening",
            description: "Speak now... (Make sure your microphone is unmuted)",
          });
        };

        recognition.onresult = (event: any) => {
          console.log('📝 Speech recognition result received', event);
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            console.log(`Result ${i}: "${transcript}" (final: ${result.isFinal})`);

            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            console.log('🗣️ Final transcript:', finalTranscript);
            console.log('🗣️ Last final transcript:', lastFinalTranscriptRef.current);
            
            // Check for duplicates
            if (finalTranscript.trim() !== lastFinalTranscriptRef.current.trim()) {
              console.log('✅ New unique transcript, processing...');
              lastFinalTranscriptRef.current = finalTranscript.trim();
              setTranscript(prev => prev + finalTranscript);
              
              if (onResult) {
                onResult({
                  transcript: finalTranscript,
                  confidence: event.results[event.results.length - 1][0].confidence || 0.9,
                  isFinal: true
                });
              }
            } else {
              console.log('🚫 Duplicate transcript ignored:', finalTranscript);
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
          
          // Don't show toast for 'no-speech' errors in continuous mode - just restart
          if (event.error === 'no-speech' && continuous && shouldContinueRef.current) {
            console.log('🔄 No speech detected, will auto-restart...');
            return; // Don't show error toast, let it restart automatically
          }
          
          // For other errors, stop continuous listening
          if (event.error !== 'no-speech') {
            shouldContinueRef.current = false;
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
          
          // Auto-restart if continuous mode is enabled and user wants to keep listening
          if (continuous && shouldContinueRef.current) {
            console.log('🔄 Auto-restarting speech recognition for continuous listening...');
            setTimeout(() => {
              if (recognitionRef.current && shouldContinueRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.warn('Failed to auto-restart speech recognition:', error);
                  // If restart fails, stop continuous listening
                  shouldContinueRef.current = false;
                }
              }
            }, 100);
          }
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

    // Enable continuous listening
    shouldContinueRef.current = true;

    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.error('❌ Not in secure context');
      toast({
        title: "Secure Context Required",
        description: "Speech recognition requires HTTPS or localhost.",
        variant: "destructive",
      });
      return;
    }

    // Check microphone permissions first
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      
      // Test if microphone is actually working
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
    } catch (permError) {
      console.error('❌ Microphone permission denied:', permError);
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to use speech recognition. Check your browser settings.",
        variant: "destructive",
      });
      return;
    }

    if (recognitionRef.current) {
      try {
        console.log('🚀 Starting speech recognition...');
        
        // Stop any existing recognition first
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        
        // Small delay to ensure previous recognition is stopped
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (startError) {
            console.error('💥 Failed to start speech recognition:', startError);
            toast({
              title: "Speech Recognition Error",
              description: "Could not start speech recognition. Please try again.",
              variant: "destructive",
            });
          }
        }, 100);
        
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
    console.log('🛑 Stopping speech recognition...');
    // Disable continuous listening first
    shouldContinueRef.current = false;
    
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    lastFinalTranscriptRef.current = ''; // Reset duplicate detection
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping speech recognition on cleanup:', error);
        }
      }
    };
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