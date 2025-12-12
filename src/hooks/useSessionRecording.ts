import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionRecordingOptions {
  sessionId: string;
  sessionTitle: string;
  hostId: string;
}

export function useSessionRecording({ sessionId, sessionTitle, hostId }: UseSessionRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async (stream: MediaStream) => {
    try {
      // Create recording entry in database
      const { data: recording, error } = await supabase
        .from('session_recordings')
        .insert({
          session_id: sessionId,
          title: sessionTitle,
          status: 'recording',
        })
        .select()
        .single();

      if (error) throw error;

      setRecordingId(recording.id);

      // Combine video and audio tracks
      const combinedStream = new MediaStream();
      stream.getTracks().forEach(track => combinedStream.addTrack(track.clone()));
      streamRef.current = combinedStream;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await saveRecording(blob, recording.id);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Track duration
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Session is now being recorded for students who couldn't attend",
      });

      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast({
        title: "Recording Error",
        description: "Failed to start recording",
        variant: "destructive",
      });
      return false;
    }
  }, [sessionId, sessionTitle, toast]);

  const saveRecording = useCallback(async (blob: Blob, recId: string) => {
    try {
      // For demo purposes, we'll create an object URL
      // In production, you'd upload to Supabase Storage
      const recordingUrl = URL.createObjectURL(blob);
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      // Update recording status
      await supabase
        .from('session_recordings')
        .update({
          status: 'completed',
          duration,
          // In production: recording_url would be the Supabase Storage URL
        })
        .eq('id', recId);

      toast({
        title: "Recording Saved",
        description: `Recording saved (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`,
      });

      // Store locally for demo viewing
      if (typeof window !== 'undefined') {
        const recordings = JSON.parse(localStorage.getItem('session_recordings') || '{}');
        recordings[recId] = recordingUrl;
        localStorage.setItem('session_recordings', JSON.stringify(recordings));
      }
    } catch (err) {
      console.error('Failed to save recording:', err);
      
      await supabase
        .from('session_recordings')
        .update({ status: 'failed' })
        .eq('id', recId);
    }
  }, [toast]);

  const stopRecording = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingId,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    startRecording,
    stopRecording,
  };
}
