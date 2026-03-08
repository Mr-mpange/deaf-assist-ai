import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Radio, 
  Users, 
  Calendar, 
  Play, 
  Plus,
  Video,
  Clock,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Circle,
  StopCircle,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
import { RaiseHandPanel } from '@/components/RaiseHandPanel';
import { TeacherRaisedHandsPanel } from '@/components/TeacherRaisedHandsPanel';
import { SessionRecordings } from '@/components/SessionRecordings';
import { TeacherCommunicationPanel } from '@/components/TeacherCommunicationPanel';
import { StudentResponsePanel } from '@/components/StudentResponsePanel';
import { FullscreenVideoModal } from '@/components/FullscreenVideoModal';
import { StudentCameraFix } from '@/components/StudentCameraFix';
import { WebRTCDebugInfo } from '@/components/WebRTCDebugInfo';
import { EmojiReactionPanel } from '@/components/EmojiReactionPanel';
import { SessionChatPanel } from '@/components/SessionChatPanel';
import { FeaturedStudentSpotlight } from '@/components/FeaturedStudentSpotlight';
import { FloatingEmojiOverlay } from '@/components/FloatingEmojiOverlay';
import { TeacherAnnouncementPanel } from '@/components/TeacherAnnouncementPanel';
import { StudentAnnouncementListener } from '@/components/StudentAnnouncementListener';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { SessionPollPanel } from '@/components/SessionPollPanel';
import { SessionTimerPanel } from '@/components/SessionTimerPanel';
import { SessionAttendancePanel } from '@/components/SessionAttendancePanel';
import { SessionWhiteboard } from '@/components/SessionWhiteboard';
import { BreakoutRoomsPanel } from '@/components/BreakoutRoomsPanel';
import { SessionNotesPanel } from '@/components/SessionNotesPanel';
import { SessionAnalytics } from '@/components/SessionAnalytics';
import { LiveCaptionsPanel } from '@/components/LiveCaptionsPanel';
import { VisualAlertOverlay } from '@/components/VisualAlertOverlay';
import { SignLanguageAvatar } from '@/components/SignLanguageAvatar';

import { useSessionRecording } from '@/hooks/useSessionRecording';
import { supabase } from '@/integrations/supabase/client';

interface LiveSession {
  id: string;
  title: string;
  host_id: string;
  host_name?: string;
  status: string;
  scheduled_at: string;
  participants_count: number;
  created_at?: string;
}

export default function LiveSessions() {
  const { user, profile, role } = useAuth();
  
  // Debug profile data
  useEffect(() => {
    if (user && profile) {
      console.log('👤 LiveSessions - User profile loaded:', {
        userId: user.id,
        profileName: profile.name,
        userEmail: user.email,
        role: role
      });
    }
  }, [user, profile, role]);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calledStudentId, setCalledStudentId] = useState<string | null>(null);
  const [fullscreenParticipant, setFullscreenParticipant] = useState<any | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [autoTimeoutId, setAutoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [recentEndedSessions, setRecentEndedSessions] = useState<LiveSession[]>([]);
  const [analyticsSessionId, setAnalyticsSessionId] = useState<string | null>(null);
  
  const isTeacher = role === 'teacher' || role === 'admin';
  const isHost = activeSession?.host_id === user?.id;

  // Memoize WebRTC config to prevent re-initialization
  const webRTCConfig = useMemo(() => {
    // Only create config if we have essential data
    if (!activeSession?.id || !user?.id) {
      return {
        roomId: '',
        userId: '',
        userName: 'Anonymous',
        isHost: false,
      };
    }

    return {
      roomId: activeSession.id,
      userId: user.id,
      userName: profile?.name || user.email?.split('@')[0] || user.id.slice(0, 8) || 'Anonymous',
      isHost: activeSession.host_id === user.id,
    };
  }, [activeSession?.id, activeSession?.host_id, user?.id, profile?.name, user?.email]);

  const {
    participants,
    isConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenStream,
    localStream,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    retryCamera,
  } = useWebRTC(webRTCConfig);

  const { playCalledSound, playJoinSound } = useNotificationSound();
  useEffect(() => {
    if (participants.length > 1 && autoTimeoutId && isHost) {
      console.log('✅ Participants joined - canceling auto-timeout');
      clearTimeout(autoTimeoutId);
      setAutoTimeoutId(null);
      
      toast({
        title: "Session Active",
        description: "Participants have joined - session will continue",
      });
    }
  }, [participants.length, autoTimeoutId, isHost, toast]);

  // Cleanup auto-timeout on component unmount
  useEffect(() => {
    return () => {
      if (autoTimeoutId) {
        clearTimeout(autoTimeoutId);
      }
    };
  }, [autoTimeoutId]);

  const {
    isRecording,
    formattedDuration,
    startRecording,
    stopRecording,
  } = useSessionRecording({
    sessionId: activeSession?.id || '',
    sessionTitle: activeSession?.title || '',
    hostId: user?.id || '',
  });

  useEffect(() => {
    fetchSessions();
    
    // Subscribe to session updates
    const channel = supabase
      .channel('live-sessions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions',
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen for when teacher calls on a student
  useEffect(() => {
    if (!activeSession || isHost) return;

    const channel = supabase
      .channel(`student-called-${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raised_hands',
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.student_id === user?.id && newData.status === 'called') {
            setCalledStudentId(user?.id || null);
            playCalledSound(); // Play notification sound
            toast({
              title: "You've been called on!",
              description: "Show your answer using sign language",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession, isHost, user?.id]);

  const fetchSessions = async () => {
    setIsLoading(true);
    
    try {
      // First, clean up stale live sessions (older than 4 hours)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('live_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('status', 'live')
        .lt('created_at', fourHoursAgo);

      // Fetch live sessions
      const { data: liveData, error: liveError } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      // Fetch upcoming sessions
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (liveError) throw liveError;
      if (upcomingError) throw upcomingError;

      // Helper function to add host names and participant counts
      const addHostNames = async (sessions: any[]) => {
        return Promise.all(
          sessions.map(async (session) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', session.host_id)
              .single();
            
            // Try to get participant count, fallback to 0 if table doesn't exist
            let participantCount = 0;
            try {
              const { count } = await supabase
                .from('session_participants')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', session.id);
              participantCount = count || 0;
            } catch (error) {
              // Table might not exist yet, use default count
              participantCount = 0;
            }
            
            return {
              ...session,
              host_name: profile?.name || 'Unknown Host',
              participants_count: participantCount,
            };
          })
        );
      };

      if (liveData) {
        const liveSessionsWithHosts = await addHostNames(liveData);
        setLiveSessions(liveSessionsWithHosts);
      }

      if (upcomingData) {
        const upcomingSessionsWithHosts = await addHostNames(upcomingData);
        setUpcomingSessions(upcomingSessionsWithHosts);
      }

      // Fetch recent ended sessions (last 7 days) for analytics
      if (isTeacher) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: endedData } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('status', 'ended')
          .eq('host_id', user?.id || '')
          .gte('created_at', weekAgo)
          .order('ended_at', { ascending: false })
          .limit(5);

        if (endedData) {
          setRecentEndedSessions(endedData);
        }
      }

    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  // Auto-end session if no participants join within 30 minutes
  const checkAndAutoEndSession = async (sessionId: string) => {
    try {
      // Check if there are any participants (excluding the host)
      const { data: participantCount } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact' })
        .eq('session_id', sessionId)
        .neq('user_id', user?.id); // Exclude the host
      
      const hasParticipants = (participantCount?.length || 0) > 0;
      
      if (!hasParticipants) {
        console.log('🕐 Auto-ending session after 30 minutes - no participants joined');
        
        // End the session
        await supabase
          .from('live_sessions')
          .update({ status: 'ended' })
          .eq('id', sessionId);
        
        // Clear the active session
        setActiveSession(null);
        setSessionStartTime(null);
        
        toast({
          title: "Session Auto-Ended",
          description: "Session ended automatically after 30 minutes with no participants",
          variant: "default",
        });
        
        // End the call if still connected
        if (isConnected) {
          endCall();
        }
      } else {
        console.log('✅ Session has participants, keeping alive');
      }
    } catch (error) {
      console.error('Error checking session participants:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim() || !user) {
      toast({
        title: "Title Required",
        description: "Please enter a session title",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        title: newSessionTitle,
        host_id: user.id,
        status: 'live',
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
      return;
    }

    setActiveSession({
      ...data,
      host_name: profile?.name || 'You',
    });
    setNewSessionTitle('');
    setIsCreating(false);
    
    // Set session start time for auto-timeout
    setSessionStartTime(new Date());
    
    // Set up auto-timeout: end session after 30 minutes if no participants join
    const timeoutId = setTimeout(() => {
      checkAndAutoEndSession(data.id);
    }, 30 * 60 * 1000); // 30 minutes
    
    setAutoTimeoutId(timeoutId);
    
    toast({
      title: "Session Created",
      description: `"${data.title}" is now live!`,
    });
    
    fetchSessions();
  };

  const handleJoinSession = async (session: LiveSession) => {
    setActiveSession(session);
  };

  // Auto-start call when session becomes active
  useEffect(() => {
    if (activeSession?.id && !isConnected && user?.id) {
      console.log('🚀 Auto-starting call for session:', activeSession.id);
      
      // Small delay to ensure state is fully updated
      const timer = setTimeout(async () => {
        const callStarted = await startCall();
        
        if (!callStarted) {
          toast({
            title: "Camera Setup Failed",
            description: "Could not start camera. Check permissions and try again.",
            variant: "destructive",
          });
        }
      }, 500); // Increased delay to prevent race conditions
      
      return () => clearTimeout(timer);
    }
  }, [activeSession?.id, isConnected, user?.id, startCall, toast]);

  // Auto-start recording for host when camera is ready
  useEffect(() => {
    if (isHost && localStream && isConnected && !isRecording) {
      console.log('🎥 Auto-starting recording for host');
      const timer = setTimeout(() => {
        startRecording(localStream);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isHost, localStream, isConnected, isRecording, startRecording]);

  const handleEndSession = async () => {
    // Stop recording first
    if (isRecording) {
      await stopRecording();
    }

    if (activeSession && isHost) {
      // Clean up raised hands
      await supabase
        .from('raised_hands')
        .delete()
        .eq('session_id', activeSession.id);

      await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
    }
    
    endCall();
    setActiveSession(null);
    setCalledStudentId(null);
    setSessionStartTime(null);
    
    // Clear auto-timeout if it exists
    if (autoTimeoutId) {
      clearTimeout(autoTimeoutId);
      setAutoTimeoutId(null);
    }
    
    fetchSessions();
  };

  const handleEndSessionFromList = async (sessionId: string) => {
    try {
      // Attempting to end session
      
      // First check if user is the host
      const { data: sessionData, error: fetchError } = await supabase
        .from('live_sessions')
        .select('host_id, title')
        .eq('id', sessionId)
        .single();

      if (fetchError) {
        console.error('Error fetching session:', fetchError);
        throw new Error('Could not verify session ownership');
      }

      if (sessionData.host_id !== user?.id) {
        throw new Error('Only the session host can end the session');
      }

      // User verified as host, proceeding to end session

      // Try to manually clean up participants first (ignore errors)
      try {
        await supabase
          .from('session_participants')
          .delete()
          .eq('session_id', sessionId);
        // Participants cleaned up successfully
      } catch (cleanupError) {
        // Could not clean up participants (this is OK)
      }

      // Now end the session
      const { error } = await supabase
        .from('live_sessions')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Database error ending session:', error);
        
        // If we get the recursion error, try a different approach
        if (error.code === '42P17' || error.message.includes('infinite recursion')) {
          // RLS recursion issue - just throw a user-friendly error
          throw new Error('Could not end session due to database policy issues. Please try refreshing the page.');
        } else {
          throw error;
        }
      }

      // Session ended successfully

      toast({
        title: "Session Ended",
        description: `"${sessionData.title}" has been ended successfully.`,
      });

      // Refresh sessions
      fetchSessions();
    } catch (error: any) {
      console.error('Error ending session:', error);
      
      let errorMessage = error.message || "Failed to end session";
      
      if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
        errorMessage = "Database policy issue detected. Please run the fix script in your Supabase SQL editor.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getSessionDuration = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const isSessionStale = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours > 2; // Consider stale after 2 hours
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else if (localStream) {
      await startRecording(localStream);
    }
  };

  const handleCallStudent = (studentId: string) => {
    setCalledStudentId(studentId);
  };

  const handleAnswerSubmitted = (sign: string, confidence: number) => {
    toast({
      title: "Answer Received",
      description: `Student answered: ${sign} (${Math.round(confidence * 100)}% confidence)`,
    });
  };

  // We now have separate state variables for live and upcoming sessions

  // Active Session View
  if (activeSession && isConnected) {
    return (
      <DashboardLayout>
        {/* Floating Emoji Overlay - visible to all */}
        <FloatingEmojiOverlay sessionId={activeSession.id} />

        {/* Student Announcement Listener */}
        {!isHost && (
          <StudentAnnouncementListener sessionId={activeSession.id} />
        )}

        {/* Visual Alert Overlay for deaf accessibility */}
        <VisualAlertOverlay sessionId={activeSession.id} />

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{activeSession.title}</h1>
              <p className="text-muted-foreground">
                Hosted by {activeSession.host_name}
              </p>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="w-3 h-3 mr-1" /> LIVE
            </Badge>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main content area */}
            <div className="lg:col-span-3 space-y-4">
              {/* Video Grid */}
              <div className="space-y-4">
                {participants.length > 1 && (
                  <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                    <p className="text-sm text-success">
                      <strong>{participants.length} participants</strong> connected with live video and audio!
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    💡 Hover over any video and click the expand icon to view fullscreen
                  </p>

                  {/* Screen Share - pinned large view */}
                  {isScreenSharing && screenStream && (
                    <div className="mb-4">
                      <VideoTile
                        stream={screenStream}
                        name="Your Screen Share"
                        isScreenShare
                        className="w-full aspect-video"
                        onClick={() => setFullscreenParticipant({
                          stream: screenStream,
                          name: "Screen Share",
                          isScreenShare: true,
                          isHost: false,
                          isMuted: false,
                          isVideoOff: false,
                          isLocal: false
                        })}
                      />
                    </div>
                  )}

                  {/* Participant tiles - smaller grid when screen sharing */}
                  <div className={cn(
                    "grid gap-4",
                    isScreenSharing
                      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                      : "grid-cols-1 md:grid-cols-2"
                  )}>
                  {participants.map((participant) => (
                    <VideoTile
                      key={`${participant.id}-${participant.stream?.id || 'no-stream'}-${participant.isVideoOff ? 'off' : 'on'}`}
                      stream={participant.stream}
                      name={participant.name}
                      isHost={participant.isHost}
                      isMuted={participant.id === user?.id ? isMuted : participant.isMuted}
                      isVideoOff={participant.id === user?.id ? isVideoOff : participant.isVideoOff}
                      isLocal={participant.id === user?.id}
                      onRetryCamera={participant.id === user?.id ? retryCamera : undefined}
                      onClick={() => setFullscreenParticipant({
                        stream: participant.stream,
                        name: participant.name,
                        isHost: participant.isHost,
                        isMuted: participant.id === user?.id ? isMuted : participant.isMuted,
                        isVideoOff: participant.id === user?.id ? isVideoOff : participant.isVideoOff,
                        isLocal: participant.id === user?.id,
                        isScreenShare: false
                      })}
                    />
                  ))}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <Card className="border-border/50 shadow-card">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant={isMuted ? "destructive" : "outline"}
                      size="lg"
                      onClick={toggleMute}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    
                    <Button
                      variant={isVideoOff ? "destructive" : "outline"}
                      size="lg"
                      onClick={toggleVideo}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </Button>
                    
                    <Button
                      variant={isScreenSharing ? "secondary" : "outline"}
                      size="lg"
                      onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                    >
                      {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </Button>



                    {/* Recording button - host only */}
                    {isHost && (
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="lg"
                        onClick={handleToggleRecording}
                        className="relative"
                      >
                        {isRecording ? (
                          <>
                            <StopCircle className="w-5 h-5 mr-2" />
                            <span className="animate-pulse">{formattedDuration}</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-5 h-5 mr-2 fill-destructive text-destructive" />
                            Record
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleEndSession}
                    >
                      <PhoneOff className="w-5 h-5 mr-2" />
                      {isHost ? 'End Session' : 'Leave'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Teacher: Communication Panel */}
              {isHost && (
                <TeacherCommunicationPanel
                  sessionId={activeSession.id}
                  onStudentResponse={(response) => handleAnswerSubmitted(response.sign, response.confidence)}
                />
              )}

              {/* Student: Response Panel */}
              {!isHost && user && profile && (
                <StudentResponsePanel
                  sessionId={activeSession.id}
                  studentId={user.id}
                  studentName={profile.name}
                  isCalledOn={calledStudentId === user.id}
                />
              )}

              {/* Teacher: Raised Hands Panel */}
              {isHost && (
                <TeacherRaisedHandsPanel
                  sessionId={activeSession.id}
                  onCallStudent={handleCallStudent}
                />
              )}

              {/* Teacher: Announcement Panel */}
              {isHost && user && (
                <TeacherAnnouncementPanel
                  sessionId={activeSession.id}
                  teacherId={user.id}
                />
              )}

              {/* Student: Raise Hand Panel */}
              {!isHost && user && profile && (
                <RaiseHandPanel
                  sessionId={activeSession.id}
                  studentId={user.id}
                  studentName={profile.name}
                  isCalledOn={calledStudentId === user.id}
                  onAnswerSubmitted={handleAnswerSubmitted}
                  onLowerHand={() => setCalledStudentId(null)}
                  liveStream={localStream}
                />
              )}

              {/* Poll/Quiz Panel - for everyone */}
              {user && profile && (
                <SessionPollPanel
                  sessionId={activeSession.id}
                  participantId={user.id}
                  participantName={profile.name}
                  isHost={isHost}
                  enableSignDetection={!isHost}
                />
              )}

              {/* Timer Panel - for everyone */}
              <SessionTimerPanel
                sessionId={activeSession.id}
                isHost={isHost}
              />

              {/* Attendance Panel - host only */}
              {isHost && (
                <SessionAttendancePanel
                  sessionId={activeSession.id}
                  sessionTitle={activeSession.title}
                  isHost={isHost}
                />
              )}

              {/* Emoji Reactions - for everyone */}
              {user && profile && (
                <EmojiReactionPanel
                  sessionId={activeSession.id}
                  participantId={user.id}
                  participantName={profile.name}
                />
              )}

              {/* Live Captions with Sign Matching - for everyone */}
              <LiveCaptionsPanel
                isHost={isHost}
                hostStream={localStream}
              />

              {/* Session Chat - for everyone */}
              {user && profile && (
                <SessionChatPanel
                  sessionId={activeSession.id}
                  participantId={user.id}
                  participantName={profile.name}
                  isHost={isHost}
                />
              )}

              {/* Whiteboard - for everyone */}
              {user && profile && (
                <SessionWhiteboard
                  sessionId={activeSession.id}
                  isHost={isHost}
                  participantName={profile.name}
                />
              )}

              {/* Breakout Rooms - for everyone */}
              {user && profile && (
                <BreakoutRoomsPanel
                  sessionId={activeSession.id}
                  participantId={user.id}
                  participantName={profile.name}
                  isHost={isHost}
                  allParticipants={participants.map(p => ({ id: p.id, name: p.name }))}
                />
              )}

              {/* Session Notes - for everyone */}
              {user && profile && (
                <SessionNotesPanel
                  sessionId={activeSession.id}
                  participantId={user.id}
                  participantName={profile.name}
                  isHost={isHost}
                />
              )}

              {/* Participants List */}
              <Card className="border-border/50 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participants ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <Badge key={p.id} variant={p.isHost ? "default" : "secondary"}>
                        {p.name} {p.isHost && '(Host)'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Student Camera Fix Helper */}
              {user && (
                <StudentCameraFix 
                  isStudent={!isHost}
                  hasStream={!!localStream}
                  onRetryCamera={retryCamera}
                />
              )}

              {/* Debug Info */}
              <WebRTCDebugInfo
                participants={participants}
                isConnected={isConnected}
                localStream={localStream}
                activeSession={activeSession}
                user={user}
              />
            </div>
          </div>

          {/* Featured Student Spotlight */}
          <FeaturedStudentSpotlight
            sessionId={activeSession.id}
            isHost={isHost}
            participants={participants}
            onDismiss={() => setCalledStudentId(null)}
          />

          {/* Fullscreen Video Modal */}
          <FullscreenVideoModal
            isOpen={!!fullscreenParticipant}
            onClose={() => setFullscreenParticipant(null)}
            stream={fullscreenParticipant?.stream}
            name={fullscreenParticipant?.name || ''}
            isHost={fullscreenParticipant?.isHost || false}
            isMuted={fullscreenParticipant?.isMuted || false}
            isVideoOff={fullscreenParticipant?.isVideoOff || false}
            isLocal={fullscreenParticipant?.isLocal || false}
            isScreenShare={fullscreenParticipant?.isScreenShare || false}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Session List View
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Radio className="w-8 h-8 text-primary" />
              Live Sessions
            </h1>
            <p className="text-muted-foreground mt-1">
              Join currently active live sessions
            </p>
          </div>

          {isTeacher && (
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Start Live Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Live Session</DialogTitle>
                  <DialogDescription>
                    Create a new live session for your students to join.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Session Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Alphabet Practice Q&A"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    variant="gradient"
                    onClick={handleCreateSession}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Go Live
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>



        {/* Live Now */}
        {liveSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              Live Now
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveSessions.map((session) => (
                <Card 
                  key={session.id} 
                  className="border-destructive/30 shadow-card overflow-hidden"
                >
                  <div className="relative aspect-video bg-gradient-primary">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-12 h-12 text-primary-foreground/50" />
                    </div>
                    <Badge 
                      className="absolute top-3 left-3 bg-destructive text-destructive-foreground"
                    >
                      LIVE
                    </Badge>
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-foreground/50 text-primary-foreground text-xs">
                      <Users className="w-3 h-3" />
                      {session.participants_count || 0}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold">{session.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        with {session.host_name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          Started {new Date(session.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={isSessionStale(session.created_at) ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {getSessionDuration(session.created_at)}
                          </Badge>
                          {isSessionStale(session.created_at) && (
                            <span className="text-xs text-destructive">⚠️</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        variant="gradient"
                        onClick={() => handleJoinSession(session)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Join Session
                      </Button>
                      {session.host_id === user?.id && (
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to end "${session.title}"? This will disconnect all participants.`)) {
                              handleEndSessionFromList(session.id);
                            }
                          }}
                        >
                          End
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Upcoming Sessions
          </h2>
          
          {upcomingSessions.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="border-border/50 shadow-card">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          with {session.host_name}
                        </p>
                      </div>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.scheduled_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(session.scheduled_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      Set Reminder
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50 shadow-card">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming sessions scheduled</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Session Analytics */}
        {isTeacher && recentEndedSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              Recent Session Analytics
            </h2>
            {analyticsSessionId ? (
              <div className="space-y-2">
                <Button variant="ghost" size="sm" onClick={() => setAnalyticsSessionId(null)}>
                  ← Back to list
                </Button>
                <SessionAnalytics
                  sessionId={analyticsSessionId}
                  sessionTitle={recentEndedSessions.find(s => s.id === analyticsSessionId)?.title || ''}
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentEndedSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="border-border/50 shadow-card cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setAnalyticsSessionId(session.id)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium truncate">{session.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(session.scheduled_at).toLocaleDateString()} • Click to view analytics
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Past Recordings */}
        <SessionRecordings />

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Live Session Features</h3>
                <p className="text-sm text-muted-foreground">
                  Join live classes with full video and audio communication! 
                  See and hear all participants in real-time.
                  Teachers can share their screen for presentations.
                  Raise your hand to answer questions using sign language!
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Live Video & Audio</Badge>
                <Badge variant="secondary">Screen Sharing</Badge>
                <Badge variant="secondary">Sign Language Q&A</Badge>
                <Badge variant="secondary">Session Recording</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}