import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  joinedAt: string;
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  isHost: boolean;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave';
  from: string;
  to?: string;
  data?: any;
  roomId: string;
}

// ICE servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC({ roomId, userId, userName, isHost }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { toast } = useToast();
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingChannelRef = useRef<any>(null);
  const participantsChannelRef = useRef<any>(null);

  const getMediaStream = useCallback(async () => {
    try {
      console.log('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      
      console.log('Media stream obtained:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Media access error:', err);
      toast({
        title: "Media Error",
        description: "Could not access camera/microphone. Please check permissions.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Send signaling message via Supabase Realtime
  const sendSignalingMessage = useCallback((message: SignalingMessage) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: message,
      });
    }
  }, []);

  // Create peer connection for a remote user
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      console.log('Received remote stream from:', remoteUserId);
      
      setParticipants(prev => prev.map(p => 
        p.id === remoteUserId 
          ? { ...p, stream: remoteStream }
          : p
      ));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          from: userId,
          to: remoteUserId,
          data: event.candidate,
          roomId,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection with ${remoteUserId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        toast({
          title: "Connected",
          description: `Video connection established with participant`,
        });
      } else if (peerConnection.connectionState === 'failed') {
        console.log('Connection failed, attempting restart...');
        peerConnection.restartIce();
      }
    };

    peerConnectionsRef.current.set(remoteUserId, peerConnection);
    return peerConnection;
  }, [userId, roomId, sendSignalingMessage, toast]);

  // Handle signaling messages
  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (message.roomId !== roomId) return;
    
    try {
      switch (message.type) {
        case 'join':
          if (message.from !== userId) {
            // Someone joined, create offer if we're already in the room
            const peerConnection = createPeerConnection(message.from);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            sendSignalingMessage({
              type: 'offer',
              from: userId,
              to: message.from,
              data: offer,
              roomId,
            });
          }
          break;

        case 'offer':
          if (message.to === userId) {
            const peerConnection = createPeerConnection(message.from);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            sendSignalingMessage({
              type: 'answer',
              from: userId,
              to: message.from,
              data: answer,
              roomId,
            });
          }
          break;

        case 'answer':
          if (message.to === userId) {
            const peerConnection = peerConnectionsRef.current.get(message.from);
            if (peerConnection) {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
            }
          }
          break;

        case 'ice-candidate':
          if (message.to === userId) {
            const peerConnection = peerConnectionsRef.current.get(message.from);
            if (peerConnection) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
            }
          }
          break;

        case 'leave':
          if (message.from !== userId) {
            const peerConnection = peerConnectionsRef.current.get(message.from);
            if (peerConnection) {
              peerConnection.close();
              peerConnectionsRef.current.delete(message.from);
            }
            
            setParticipants(prev => prev.filter(p => p.id !== message.from));
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }, [roomId, userId, createPeerConnection, sendSignalingMessage]);

  // Add participant (with WebRTC connection)
  const addParticipant = useCallback((participantData: any) => {
    console.log('Adding participant:', participantData);
    console.log('Current user ID:', userId);
    console.log('Local stream available:', !!localStream);
    
    const newParticipant: Participant = {
      id: participantData.user_id,
      name: participantData.name,
      isHost: participantData.is_host,
      isMuted: participantData.is_muted || false,
      isVideoOff: participantData.is_video_off || false,
      joinedAt: participantData.joined_at,
      // Local stream for current user, remote stream will be added via WebRTC
      stream: participantData.user_id === userId ? localStream || undefined : undefined,
    };
    
    console.log('Created participant:', newParticipant);
    
    setParticipants(prev => {
      // Avoid duplicates
      if (prev.find(p => p.id === participantData.user_id)) {
        console.log('Participant already exists, skipping');
        return prev;
      }
      console.log('Adding new participant to list');
      return [...prev, newParticipant];
    });
    
    // Show notification for new participants (except self)
    if (participantData.user_id !== userId) {
      toast({
        title: "Participant Joined",
        description: `${participantData.name} has joined the session`,
      });
    }
  }, [userId, localStream, toast]);

  const removeParticipant = useCallback((participantId: string, participantName: string) => {
    // Close peer connection
    const peerConnection = peerConnectionsRef.current.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(participantId);
    }
    
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    
    // Show notification for leaving participants (except self)
    if (participantId !== userId) {
      toast({
        title: "Participant Left",
        description: `${participantName} has left the session`,
      });
    }
  }, [userId, toast]);

  const startCall = useCallback(async () => {
    if (!roomId || !userId) return false;
    
    const stream = await getMediaStream();
    if (!stream) return false;
    
    try {
      // Setup WebRTC signaling channel
      signalingChannelRef.current = supabase.channel(`webrtc-${roomId}`)
        .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
          handleSignalingMessage(payload);
        })
        .subscribe();

      // Try to setup participant tracking (graceful fallback if table doesn't exist)
      let useDatabase = true;
      
      try {
        // Test if table exists by doing a simple query
        await supabase
          .from('session_participants')
          .select('id')
          .limit(1);
          
        // If we get here, table exists - setup database tracking
        participantsChannelRef.current = supabase.channel(`participants-${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'session_participants',
              filter: `session_id=eq.${roomId}`,
            },
            ({ new: newParticipant }) => {
              addParticipant(newParticipant);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'session_participants',
              filter: `session_id=eq.${roomId}`,
            },
            ({ old: oldParticipant }) => {
              removeParticipant(oldParticipant.user_id, oldParticipant.name);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'session_participants',
              filter: `session_id=eq.${roomId}`,
            },
            ({ new: updatedParticipant }) => {
              setParticipants(prev => prev.map(p => 
                p.id === updatedParticipant.user_id 
                  ? { ...p, isMuted: updatedParticipant.is_muted, isVideoOff: updatedParticipant.is_video_off }
                  : p
              ));
            }
          )
          .subscribe();

        // Add participant to database
        const { error } = await supabase
          .from('session_participants')
          .upsert({
            session_id: roomId,
            user_id: userId,
            name: userName,
            is_host: isHost,
            is_muted: false,
            is_video_off: false,
            joined_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error adding participant:', error);
          useDatabase = false;
        } else {
          // Fetch existing participants
          const { data: existingParticipants } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', roomId);

          if (existingParticipants) {
            existingParticipants.forEach(participant => {
              addParticipant(participant);
            });
          }
        }
      } catch (error) {
        console.warn('Database participant tracking not available, using WebRTC signaling only');
        useDatabase = false;
      }

      // Fallback: Add self as participant locally if database not available
      if (!useDatabase) {
        console.log('Adding self as participant with stream:', stream);
        setParticipants([{
          id: userId,
          name: userName,
          stream,
          isHost,
          isMuted: false,
          isVideoOff: false,
          joinedAt: new Date().toISOString(),
        }]);
        
        toast({
          title: "WebRTC Mode",
          description: "Using direct peer-to-peer connections (database tracking unavailable)",
        });
      }

      // Announce joining to other participants
      sendSignalingMessage({
        type: 'join',
        from: userId,
        roomId,
      });
      
      setIsConnected(true);
      
      toast({
        title: isHost ? "Session Started" : "Joined Session",
        description: "Setting up video connections with other participants...",
      });
      
      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      return false;
    }
  }, [getMediaStream, roomId, userId, userName, isHost, toast, addParticipant, removeParticipant, handleSignalingMessage, sendSignalingMessage]);

  const endCall = useCallback(async () => {
    // Announce leaving to other participants
    sendSignalingMessage({
      type: 'leave',
      from: userId,
      roomId,
    });

    try {
      // Remove participant from database
      if (roomId && userId) {
        await supabase
          .from('session_participants')
          .delete()
          .eq('session_id', roomId)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // Close channels
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    
    if (participantsChannelRef.current) {
      supabase.removeChannel(participantsChannelRef.current);
      participantsChannelRef.current = null;
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    setLocalStream(null);
    setParticipants([]);
    setIsConnected(false);
    setIsScreenSharing(false);
    
    toast({
      title: "Session Ended",
      description: "You have left the live session",
    });
  }, [roomId, userId, toast, sendSignalingMessage]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Update local participant state
        setParticipants(prev => prev.map(p => 
          p.id === userId ? { ...p, isMuted: !audioTrack.enabled } : p
        ));
        
        // Try to update database (graceful failure)
        if (roomId && userId) {
          supabase
            .from('session_participants')
            .update({ is_muted: !audioTrack.enabled })
            .eq('session_id', roomId)
            .eq('user_id', userId)
            .catch(() => {
              // Silently fail if database not available
            });
        }
      }
    }
  }, [roomId, userId]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        
        // Update local participant state
        setParticipants(prev => prev.map(p => 
          p.id === userId ? { ...p, isVideoOff: !videoTrack.enabled } : p
        ));
        
        // Try to update database (graceful failure)
        if (roomId && userId) {
          supabase
            .from('session_participants')
            .update({ is_video_off: !videoTrack.enabled })
            .eq('session_id', roomId)
            .eq('user_id', userId)
            .catch(() => {
              // Silently fail if database not available
            });
        }
      }
    }
  }, [roomId, userId]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });
      
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnectionsRef.current.forEach(async (peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      });
      
      // Handle when user stops sharing via browser UI
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      toast({
        title: "Screen Sharing Started",
        description: "Your screen is now visible to all participants",
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

  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    
    // Replace screen share track back to camera
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      peerConnectionsRef.current.forEach(async (peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      });
    }
    
    toast({
      title: "Screen Sharing Stopped",
      description: "Returned to camera view",
    });
  }, [toast]);

  // Update local participant stream when localStream changes
  useEffect(() => {
    if (localStream && userId) {
      console.log('Updating local participant stream');
      setParticipants(prev => prev.map(p => 
        p.id === userId ? { ...p, stream: localStream } : p
      ));
    }
  }, [localStream, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (participantsChannelRef.current) {
        supabase.removeChannel(participantsChannelRef.current);
      }
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
  };
}
