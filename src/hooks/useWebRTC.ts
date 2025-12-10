import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  isHost: boolean;
}

// Simple signaling using Supabase Realtime (for demo purposes)
// In production, you'd want a proper signaling server

export function useWebRTC({ roomId, userId, userName, isHost }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { toast } = useToast();
  
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const getMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      toast({
        title: "Media Error",
        description: "Could not access camera/microphone. Please check permissions.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const startCall = useCallback(async () => {
    const stream = await getMediaStream();
    if (!stream) return false;
    
    // Add self as participant
    setParticipants([{
      id: userId,
      name: userName,
      stream,
      isHost,
      isMuted: false,
      isVideoOff: false,
    }]);
    
    setIsConnected(true);
    
    toast({
      title: isHost ? "Session Started" : "Joined Session",
      description: isHost ? "Waiting for participants to join..." : "Connected to the live session",
    });
    
    return true;
  }, [getMediaStream, userId, userName, isHost, toast]);

  const endCall = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    setLocalStream(null);
    setParticipants([]);
    setIsConnected(false);
    setIsScreenSharing(false);
    
    toast({
      title: "Session Ended",
      description: "You have left the live session",
    });
  }, [toast]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });
      
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      
      // Handle when user stops sharing via browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      toast({
        title: "Screen Sharing Started",
        description: "Your screen is now visible to participants",
      });
      
      return screenStream;
    } catch (err) {
      toast({
        title: "Screen Share Error",
        description: "Could not start screen sharing",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    
    toast({
      title: "Screen Sharing Stopped",
      description: "Returned to camera view",
    });
  }, [toast]);

  // Simulate adding a remote participant (for demo)
  const addDemoParticipant = useCallback((name: string) => {
    const demoParticipant: Participant = {
      id: `demo-${Date.now()}`,
      name,
      isHost: false,
      isMuted: false,
      isVideoOff: false,
    };
    
    setParticipants(prev => [...prev, demoParticipant]);
    
    toast({
      title: "Participant Joined",
      description: `${name} has joined the session`,
    });
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
    };
  }, []);

  return {
    localStream,
    participants,
    isConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenStream: screenStreamRef.current,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    addDemoParticipant,
  };
}
