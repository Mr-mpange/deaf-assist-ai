import { useCallback, useRef } from 'react';

type SoundType = 'called' | 'reaction' | 'message' | 'join' | 'leave';

const SOUND_FREQUENCIES: Record<SoundType, { freq: number; duration: number; type: OscillatorType }[]> = {
  called: [
    { freq: 880, duration: 150, type: 'sine' },
    { freq: 1100, duration: 150, type: 'sine' },
    { freq: 1320, duration: 200, type: 'sine' },
  ],
  reaction: [
    { freq: 600, duration: 80, type: 'sine' },
    { freq: 800, duration: 80, type: 'sine' },
  ],
  message: [
    { freq: 440, duration: 100, type: 'sine' },
    { freq: 550, duration: 100, type: 'sine' },
  ],
  join: [
    { freq: 400, duration: 100, type: 'sine' },
    { freq: 500, duration: 100, type: 'sine' },
    { freq: 600, duration: 150, type: 'sine' },
  ],
  leave: [
    { freq: 500, duration: 100, type: 'sine' },
    { freq: 400, duration: 150, type: 'sine' },
  ],
};

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    try {
      const audioContext = getAudioContext();
      const sounds = SOUND_FREQUENCIES[type];
      
      let startTime = audioContext.currentTime;
      
      sounds.forEach((sound) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.freq, startTime);
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + sound.duration / 1000);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + sound.duration / 1000);
        
        startTime += sound.duration / 1000;
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [getAudioContext]);

  const playCalledSound = useCallback(() => playSound('called'), [playSound]);
  const playReactionSound = useCallback(() => playSound('reaction'), [playSound]);
  const playMessageSound = useCallback(() => playSound('message'), [playSound]);
  const playJoinSound = useCallback(() => playSound('join'), [playSound]);
  const playLeaveSound = useCallback(() => playSound('leave'), [playSound]);

  return {
    playSound,
    playCalledSound,
    playReactionSound,
    playMessageSound,
    playJoinSound,
    playLeaveSound,
  };
}
