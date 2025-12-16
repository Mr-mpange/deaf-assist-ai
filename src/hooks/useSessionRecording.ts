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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async (stream: MediaStream) => {
    if (!sessionId) return false;
    
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

      // Set up MediaRecorder with best supported codec
      let mimeType = 'video/webm';
      let options: MediaRecorderOptions = {};

      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
        options = { mimeType, videoBitsPerSecond: 2500000 };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
        options = { mimeType, videoBitsPerSecond: 2000000 };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        options = { mimeType, videoBitsPerSecond: 2000000 };
      } else {
        mimeType = 'video/webm';
        options = { mimeType };
      }

      console.log('Using recording format:', mimeType);

      const mediaRecorder = new MediaRecorder(combinedStream, options);

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
      mediaRecorder.start(1000);

      startTimeRef.current = Date.now();
      setIsRecording(true);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Session is being recorded for students who can't attend",
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
    setIsUploading(true);
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      // Determine file extension based on blob type
      const fileExtension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${sessionId}/${recId}-${Date.now()}.${fileExtension}`;

      console.log('Uploading recording:', fileName, 'Size:', blob.size, 'Type:', blob.type);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('session-recordings')
        .getPublicUrl(fileName);

      // Update recording with URL and duration
      const { error: updateError } = await supabase
        .from('session_recordings')
        .update({
          status: 'completed',
          duration,
          recording_url: urlData.publicUrl,
        })
        .eq('id', recId);

      if (updateError) throw updateError;

      toast({
        title: "Recording Saved",
        description: `Recording uploaded (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`,
      });
    } catch (err) {
      console.error('Failed to save recording:', err);
      
      await supabase
        .from('session_recordings')
        .update({ status: 'failed' })
        .eq('id', recId);

      toast({
        title: "Upload Failed",
        description: "Recording could not be saved to cloud",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, toast]);

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
    isUploading,
    recordingId,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    startRecording,
    stopRecording,
  };
}
