import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpeechTestButtonProps {
  text: string;
  className?: string;
}

export function SpeechTestButton({ text, className = "" }: SpeechTestButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const testSpeak = () => {
    console.log('🔊 Testing speech with text:', text);
    
    if (!text.trim()) {
      toast({
        title: "No Text",
        description: "No text to speak",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      console.log('⚠️ Already speaking, ignoring click');
      return;
    }

    if ('speechSynthesis' in window) {
      try {
        // Stop any current speech and wait
        if (speechSynthesis.speaking) {
          console.log('⏹️ Stopping current speech...');
          speechSynthesis.cancel();
        }

        setIsSpeaking(true);

        // Wait a bit for cancellation to complete
        setTimeout(() => {
          // Check if voices are loaded
          const voices = speechSynthesis.getVoices();
          console.log('📢 Available voices:', voices.length);
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.8;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';
          
          // Try to set a specific voice
          if (voices.length > 0) {
            const englishVoice = voices.find(voice => 
              voice.lang.includes('en') && voice.localService
            ) || voices[0];
            utterance.voice = englishVoice;
            console.log('🎙️ Using voice:', englishVoice.name, englishVoice.lang);
          }

          utterance.onstart = () => {
            console.log('🎤 Speech test started for:', text);
          };

          utterance.onend = () => {
            console.log('✅ Speech test completed for:', text);
            setIsSpeaking(false);
          };

          utterance.onerror = (event) => {
            console.error('❌ Speech test error for:', text, event.error);
            setIsSpeaking(false);
            
            toast({
              title: "Speech Error",
              description: `Speech failed: ${event.error}`,
              variant: "destructive",
            });
          };

          // Add timeout to detect if speech never starts
          const timeout = setTimeout(() => {
            if (isSpeaking) {
              console.warn('⏰ Speech timeout - forcing stop');
              setIsSpeaking(false);
              speechSynthesis.cancel();
              toast({
                title: "Speech Timeout",
                description: "Speech took too long to start",
                variant: "destructive",
              });
            }
          }, 5000);

          utterance.onstart = () => {
            console.log('🎤 Speech test started for:', text);
            clearTimeout(timeout);
          };

          utterance.onend = () => {
            console.log('✅ Speech test completed for:', text);
            clearTimeout(timeout);
            setIsSpeaking(false);
          };

          console.log('🚀 Starting speech for:', text);
          
          // Force audio context resume (Chrome requirement)
          if (typeof (window as any).AudioContext !== 'undefined') {
            console.log('🔊 Resuming audio context...');
          }
          
          speechSynthesis.speak(utterance);
          
          // Double-check if speech is actually queued
          setTimeout(() => {
            console.log('📊 Speech status - speaking:', speechSynthesis.speaking, 'pending:', speechSynthesis.pending);
          }, 100);

        }, 300); // Increased delay

      } catch (error) {
        console.error('💥 Speech test failed:', error);
        setIsSpeaking(false);
        toast({
          title: "Speech Test Error",
          description: "Failed to initialize speech",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not Supported",
        description: "Speech synthesis not supported in this browser",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={testSpeak}
      disabled={isSpeaking}
      className={className}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
}