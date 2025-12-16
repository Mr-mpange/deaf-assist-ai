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

// Check camera permissions before requesting access
const checkCameraPermissions = async () => {
  try {
    if (!navigator.permissions) {
      console.log('Permissions API not available');
      return 'unknown';
    }
    
    const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    
    console.log('Camera permission:', cameraPermission.state);
    console.log('Microphone permission:', micPermission.state);
    
    return {
      camera: cameraPermission.state,
      microphone: micPermission.state
    };
  } catch (error) {
    console.log('Could not check permissions:', error);
    return 'unknown';
  }
};

export function useWebRTC({ roomId, userId, userName, isHost }: UseWebRTCOptions) {
  console.log('🎭 WebRTC initialized with:', { roomId, userId, userName, isHost });
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

  const getMediaStream = useCallback(async (retryCount = 0) => {
    try {
      console.log(`🎥 [${isHost ? 'HOST' : 'STUDENT'}] Requesting camera access (attempt ${retryCount + 1})...`);
      
      // Check if we're on HTTPS (required for production)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('HTTPS required for camera access');
      }
      
      // Check permissions first
      const permissions = await checkCameraPermissions();
      if (permissions !== 'unknown') {
        console.log('📋 Current permissions:', permissions);
        if (typeof permissions === 'object' && (permissions.camera === 'denied' || permissions.microphone === 'denied')) {
          throw new Error('Camera or microphone permission denied. Please allow access in your browser settings.');
        }
      }
      
      // Progressive fallback constraints
      const constraintOptions = [
        // High quality
        {
          video: { 
            width: { ideal: 1280, max: 1920 }, 
            height: { ideal: 720, max: 1080 }, 
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 }
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          },
        },
        // Medium quality
        {
          video: { 
            width: { ideal: 640, max: 1280 }, 
            height: { ideal: 480, max: 720 }, 
            facingMode: 'user'
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true
          },
        },
        // Basic quality
        {
          video: { 
            width: 320, 
            height: 240,
            facingMode: 'user'
          },
          audio: true,
        },
        // Audio only fallback
        {
          video: false,
          audio: true,
        }
      ];
      
      const constraints = constraintOptions[Math.min(retryCount, constraintOptions.length - 1)];
      console.log('Using constraints:', constraints);
      
      // Add timeout to camera access (15 seconds)
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Camera access timeout after 15 seconds')), 15000);
      });
      
      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
      
      console.log('✅ Media stream obtained successfully');
      console.log('Video tracks:', stream.getVideoTracks().length);
      console.log('Audio tracks:', stream.getAudioTracks().length);
      
      // Verify tracks are active
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        console.log('Video track state:', videoTrack.readyState);
        console.log('Video track enabled:', videoTrack.enabled);
        console.log('Video track settings:', videoTrack.getSettings());
        
        // Handle track ending
        videoTrack.onended = () => {
          console.log('Video track ended, attempting restart...');
          retryCamera();
        };
      }
      
      if (audioTrack) {
        console.log('Audio track state:', audioTrack.readyState);
        console.log('Audio track enabled:', audioTrack.enabled);
        
        // Handle track ending
        audioTrack.onended = () => {
          console.log('Audio track ended, attempting restart...');
          retryCamera();
        };
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      console.log('✅ Camera setup completed successfully');
      
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      
      toast({
        title: "Media Ready",
        description: `${hasVideo ? 'Camera' : ''}${hasVideo && hasAudio ? ' and ' : ''}${hasAudio ? 'microphone' : ''} access granted`,
      });
      
      return stream;
    } catch (err: any) {
      console.error('❌ Media access error:', err);
      
      // Try fallback constraints if this was the first attempt
      if (retryCount < 3 && err.name === 'OverconstrainedError') {
        console.log('Trying with lower quality settings...');
        return getMediaStream(retryCount + 1);
      }
      
      let errorMessage = "Could not access camera/microphone.";
      let suggestion = "Please check your camera permissions and try again.";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied.";
        suggestion = "Please allow camera access in your browser and refresh the page.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera or microphone found.";
        suggestion = "Please connect a camera/microphone and try again.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application.";
        suggestion = "Please close other apps using your camera and try again.";
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = "Camera doesn't support the required settings.";
        suggestion = "Your camera may not support the video quality settings.";
      } else if (err.message.includes('timeout')) {
        errorMessage = "Camera setup timed out.";
        suggestion = "Your camera may be slow to start. Try again or restart your browser.";
      }
      
      toast({
        title: "Camera Setup Failed",
        description: `${errorMessage} ${suggestion}`,
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
    console.log('🔍 Adding participant:', participantData);
    console.log('🔍 Participant name from DB:', participantData.name);
    console.log('🔍 Current user ID:', userId);
    console.log('🔍 Local stream available:', !!localStream);
    
    const newParticipant: Participant = {
      id: participantData.user_id,
      name: participantData.name || `User ${participantData.user_id.slice(0, 8)}`,
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
        // Test if table exists and policies work by doing a simple query
        const { error: testError } = await supabase
          .from('session_participants')
          .select('id')
          .limit(1);
          
        if (testError && (testError.message.includes('infinite recursion') || testError.code === '42P17')) {
          console.warn('Database has RLS recursion issue, using fallback mode');
          useDatabase = false;
        } else if (testError && testError.message.includes('does not exist')) {
          console.warn('session_participants table does not exist');
          useDatabase = false;
        }
          
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
        console.log('🎥 Adding self as participant with stream:', stream);
        console.log('👤 User details:', { userId, userName, isHost });
        console.log('🎭 Creating local participant with name:', userName);
        
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
          title: isHost ? "Host Mode" : "Student Mode",
          description: isHost ? "Session started with your camera" : "Joined session with your camera",
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

  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const willTurnOff = !isVideoOff;
    
    if (willTurnOff) {
      // Turn off video - just disable the track
      videoTrack.enabled = false;
      setIsVideoOff(true);
    } else {
      // Turn on video - need to restart the track properly
      try {
        // Stop the old track
        videoTrack.stop();
        
        // Get a new video stream
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280, max: 1920 }, 
            height: { ideal: 720, max: 1080 }, 
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false // Only get video, keep existing audio
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Replace the video track in the local stream
        localStreamRef.current.removeTrack(videoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        
        // Update the stream reference
        setLocalStream(localStreamRef.current);
        
        // Replace video track in all peer connections
        peerConnectionsRef.current.forEach(async (peerConnection) => {
          const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        });
        
        setIsVideoOff(false);
        
        toast({
          title: "Camera Restarted",
          description: "Video is now active",
        });
      } catch (error) {
        console.error('Error restarting video:', error);
        toast({
          title: "Camera Error",
          description: "Could not restart camera. Try refreshing the page.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Update local participant state
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, isVideoOff: willTurnOff } : p
    ));
    
    // Try to update database (graceful failure)
    if (roomId && userId) {
      supabase
        .from('session_participants')
        .update({ is_video_off: willTurnOff })
        .eq('session_id', roomId)
        .eq('user_id', userId)
        .catch(() => {
          // Silently fail if database not available
        });
    }
  }, [roomId, userId, isVideoOff, toast]);

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
      console.log('🎥 Updating local participant stream for user:', userId);
      setParticipants(prev => {
        const updated = prev.map(p => 
          p.id === userId ? { ...p, stream: localStream } : p
        );
        console.log('📹 Updated participants with local stream:', updated);
        return updated;
      });
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

  const retryCamera = useCallback(async () => {
    console.log('Retrying camera setup...');
    
    toast({
      title: "Restarting Camera",
      description: "Attempting to restart camera and microphone...",
    });
    
    // Stop existing stream if any
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to get media stream again
    const stream = await getMediaStream();
    if (stream) {
      // Update participants with new stream
      if (isConnected) {
        setParticipants(prev => prev.map(p => 
          p.id === userId ? { ...p, stream } : p
        ));
        
        // Replace tracks in all peer connections
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        peerConnectionsRef.current.forEach(async (peerConnection) => {
          if (videoTrack) {
            const videoSender = peerConnection.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (videoSender) {
              await videoSender.replaceTrack(videoTrack);
            }
          }
          
          if (audioTrack) {
            const audioSender = peerConnection.getSenders().find(s => 
              s.track && s.track.kind === 'audio'
            );
            if (audioSender) {
              await audioSender.replaceTrack(audioTrack);
            }
          }
        });
      }
      
      toast({
        title: "Camera Restarted",
        description: "Camera and microphone are working again!",
      });
    }
    
    return !!stream;
  }, [getMediaStream, isConnected, userId, toast]);

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
    retryCamera,
  };
}
