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
  connectionState?: RTCPeerConnectionState;
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  isHost: boolean;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left';
  from: string;
  to: string;
  data?: any;
}

// STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
  const signalingChannelRef = useRef<any>(null);

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

  // Create peer connection for a specific user
  const createPeerConnection = useCallback((remoteUserId: string) => {
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setParticipants(prev => prev.map(p => 
        p.id === remoteUserId 
          ? { ...p, stream: remoteStream }
          : p
      ));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        sendSignalingMessage({
          type: 'ice-candidate',
          from: userId,
          to: remoteUserId,
          data: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection with ${remoteUserId}:`, peerConnection.connectionState);
      
      // Update participant connection status
      setParticipants(prev => prev.map(p => 
        p.id === remoteUserId 
          ? { ...p, connectionState: peerConnection.connectionState }
          : p
      ));

      if (peerConnection.connectionState === 'failed') {
        // Attempt to restart ICE
        peerConnection.restartIce();
        toast({
          title: "Connection Issue",
          description: `Reconnecting to ${remoteUserId}...`,
          variant: "destructive",
        });
      } else if (peerConnection.connectionState === 'connected') {
        toast({
          title: "Connected",
          description: `Successfully connected to participant`,
        });
      }
    };

    peerConnectionsRef.current.set(remoteUserId, peerConnection);
    return peerConnection;
  }, [userId]);

  // Send signaling message through database
  const sendSignalingMessage = useCallback(async (message: SignalingMessage) => {
    try {
      await supabase
        .from('webrtc_signals')
        .insert({
          session_id: roomId,
          from_user_id: message.from,
          to_user_id: message.to,
          signal_type: message.type,
          signal_data: message.data,
        });
    } catch (error) {
      console.warn('Error sending signaling message (table may not exist):', error);
      // Fallback to broadcast if database signaling fails
      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'signaling',
          payload: message,
        });
      }
    }
  }, [roomId]);

  // Handle signaling messages from database
  const handleSignalingMessage = useCallback(async (signal: any) => {
    if (signal.to_user_id !== userId) return;

    const peerConnection = peerConnectionsRef.current.get(signal.from_user_id) || createPeerConnection(signal.from_user_id);

    try {
      switch (signal.signal_type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await sendSignalingMessage({
            type: 'answer',
            from: userId,
            to: signal.from_user_id,
            data: answer,
          });
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          break;

        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          break;
      }

      // Mark signal as processed
      await supabase
        .from('webrtc_signals')
        .update({ processed: true })
        .eq('id', signal.id);

    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  }, [userId, createPeerConnection, sendSignalingMessage]);

  // Initiate connection with a remote user
  const initiateConnection = useCallback(async (remoteUserId: string) => {
    const peerConnection = createPeerConnection(remoteUserId);
    
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        from: userId,
        to: remoteUserId,
        data: offer,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, sendSignalingMessage, userId]);

  const startCall = useCallback(async () => {
    if (!roomId || !userId) return false;
    
    const stream = await getMediaStream();
    if (!stream) return false;
    
    try {
      // Setup signaling channel for WebRTC signals
      signalingChannelRef.current = supabase.channel(`webrtc-signals-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'webrtc_signals',
            filter: `to_user_id=eq.${userId}`,
          },
          ({ new: newSignal }) => {
            handleSignalingMessage(newSignal);
          }
        )
        .on('broadcast', { event: 'signaling' }, ({ payload }) => {
          // Fallback broadcast signaling
          if (payload.to === userId) {
            const signal = {
              from_user_id: payload.from,
              to_user_id: payload.to,
              signal_type: payload.type,
              signal_data: payload.data,
              id: 'broadcast-' + Date.now(),
            };
            handleSignalingMessage(signal);
          }
        })
       

      // Add participant to database (if table exists)
      try {
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
        }
      } catch (error) {
        console.warn('session_participants table not available yet:', error);
      }

      // Process any pending signals (if table exists)
      try {
        const { data: pendingSignals } = await supabase
          .from('webrtc_signals')
          .select('*')
          .eq('session_id', roomId)
          .eq('to_user_id', userId)
          .eq('processed', false)
          .order('created_at', { ascending: true });

        if (pendingSignals) {
          for (const signal of pendingSignals) {
            await handleSignalingMessage(signal);
          }
        }
      } catch (error) {
        console.warn('webrtc_signals table not available yet:', error);
      }

      // Add self as participant locally
      setParticipants([{
        id: userId,
        name: userName,
        stream,
        isHost,
        isMuted: false,
        isVideoOff: false,
        joinedAt: new Date().toISOString(),
      }]);
      
      setIsConnected(true);
      
      toast({
        title: isHost ? "Session Started" : "Joined Session",
        description: isHost ? "Waiting for participants to join..." : "Connected to the live session",
      });
      
      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      return false;
    }
  }, [getMediaStream, roomId, userId, userName, isHost, toast, handleSignalingMessage]);

  const endCall = useCallback(async () => {
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

    // Close signaling channel
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
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
  }, [roomId, userId, toast]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Update participant state in database
        if (roomId && userId) {
          supabase
            .from('session_participants')
            .update({ is_muted: !audioTrack.enabled })
            .eq('session_id', roomId)
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) console.error('Error updating mute state:', error);
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
        
        // Update participant state in database
        if (roomId && userId) {
          supabase
            .from('session_participants')
            .update({ is_video_off: !videoTrack.enabled })
            .eq('session_id', roomId)
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) console.error('Error updating video state:', error);
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

  // Real-time participant tracking and WebRTC connection management
  useEffect(() => {
    if (!roomId || !isConnected) return;

    // Fetch current participants
    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', roomId);

        if (error) {
          console.error('Error fetching participants:', error);
          return;
        }

        const participantList: Participant[] = data.map(p => ({
          id: p.user_id,
          name: p.name,
          isHost: p.is_host,
          isMuted: p.is_muted,
          isVideoOff: p.is_video_off,
          joinedAt: p.joined_at,
          // Add local stream only for current user
          stream: p.user_id === userId ? localStream || undefined : undefined,
        }));

        setParticipants(participantList);

        // Initiate WebRTC connections with existing participants (except self)
        data.forEach(participant => {
          if (participant.user_id !== userId && !peerConnectionsRef.current.has(participant.user_id)) {
            // Only initiate if we're the host or if we joined after them
            if (isHost || new Date(participant.joined_at) < new Date()) {
              initiateConnection(participant.user_id);
            }
          }
        });
      } catch (error) {
        console.error('Error in fetchParticipants:', error);
      }
    };

    fetchParticipants();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`session-participants-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${roomId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT' && newRecord) {
            const newParticipant: Participant = {
              id: newRecord.user_id,
              name: newRecord.name,
              isHost: newRecord.is_host,
              isMuted: newRecord.is_muted,
              isVideoOff: newRecord.is_video_off,
              joinedAt: newRecord.joined_at,
              stream: newRecord.user_id === userId ? localStream || undefined : undefined,
            };
            
            setParticipants(prev => {
              // Avoid duplicates
              if (prev.find(p => p.id === newRecord.user_id)) return prev;
              return [...prev, newParticipant];
            });
            
            // Initiate WebRTC connection with new participant (except self)
            if (newRecord.user_id !== userId) {
              // Host always initiates, or if we're already in the session
              if (isHost) {
                initiateConnection(newRecord.user_id);
              }
              
              toast({
                title: "Participant Joined",
                description: `${newRecord.name} has joined the session`,
              });
            }
          } else if (eventType === 'DELETE' && oldRecord) {
            // Close peer connection
            const peerConnection = peerConnectionsRef.current.get(oldRecord.user_id);
            if (peerConnection) {
              peerConnection.close();
              peerConnectionsRef.current.delete(oldRecord.user_id);
            }
            
            setParticipants(prev => prev.filter(p => p.id !== oldRecord.user_id));
            
            // Show notification for leaving participants (except self)
            if (oldRecord.user_id !== userId) {
              toast({
                title: "Participant Left",
                description: `${oldRecord.name} has left the session`,
              });
            }
          } else if (eventType === 'UPDATE' && newRecord) {
            setParticipants(prev => prev.map(p => 
              p.id === newRecord.user_id 
                ? { ...p, isMuted: newRecord.is_muted, isVideoOff: newRecord.is_video_off }
                : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isConnected, userId, localStream, toast, isHost, initiateConnection]);

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
      if (signalingChannelRef.current) {
        supabase.removeChannel(signalingChannelRef.current);
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
