import { useState, useEffect } from 'react';
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
  StopCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
import { RaiseHandPanel } from '@/components/RaiseHandPanel';
import { TeacherRaisedHandsPanel } from '@/components/TeacherRaisedHandsPanel';
import { SessionRecordings } from '@/components/SessionRecordings';
import { SignToCommunicate } from '@/components/SignToCommunicate';
import { TeacherCommunicationPanel } from '@/components/TeacherCommunicationPanel';
import { StudentResponsePanel } from '@/components/StudentResponsePanel';
import { LiveSignDetectionFeed } from '@/components/LiveSignDetectionFeed';
import { CameraDiagnostic } from '@/components/CameraDiagnostic';
import { SpeechTest } from '@/components/SpeechTest';
import { SimpleSpeechTest } from '@/components/SimpleSpeechTest';
import { TextToSpeechTest } from '@/components/TextToSpeechTest';
import { AudioTest } from '@/components/AudioTest';
import { LiveSessionDiagnostic } from '@/components/LiveSessionDiagnostic';
import { FullscreenVideoModal } from '@/components/FullscreenVideoModal';
import { RecordingDiagnostic } from '@/components/RecordingDiagnostic';
import { StudentCameraFix } from '@/components/StudentCameraFix';
import { FixedSpeechTest } from '@/components/FixedSpeechTest';



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
}

export default function LiveSessions() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calledStudentId, setCalledStudentId] = useState<string | null>(null);
  const [fullscreenParticipant, setFullscreenParticipant] = useState<any | null>(null);
  
  const isTeacher = role === 'teacher' || role === 'admin';
  const isHost = activeSession?.host_id === user?.id;

  // Host status tracking for active session

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
  } = useWebRTC({
    roomId: activeSession?.id || '',
    userId: user?.id || '',
    userName: profile?.name || 'Anonymous',
    isHost: isHost,
  });

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
    
    // Starting call for new session
    
    // Give a moment for state to update
    setTimeout(async () => {
      const callStarted = await startCall();
      
      if (!callStarted) {
        toast({
          title: "Camera Setup Failed",
          description: "Could not start camera. Check permissions and try again.",
          variant: "destructive",
        });
      }
    }, 100);
    
    toast({
      title: "Session Created",
      description: `"${data.title}" is now live!`,
    });

    // Auto-start recording for the session
    if (callStarted && localStream) {
      setTimeout(() => {
        if (localStream) {
          startRecording(localStream);
        }
      }, 1000);
    }
    
    fetchSessions();
  };

  const handleJoinSession = async (session: LiveSession) => {
    setActiveSession(session);
    await startCall();
  };

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
          // Trying alternative approach due to RLS recursion
          
          // Use RPC call to bypass RLS
          const { error: rpcError } = await supabase.rpc('end_session_manual', {
            session_id: sessionId,
            user_id: user?.id
          });
          
          if (rpcError) {
            throw new Error('Could not end session due to database policy issues. Please contact support.');
          }
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>{participants.length} participants</strong> connected with live video and audio!
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    💡 Click on any video to view in fullscreen
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isScreenSharing && screenStream && (
                    <div className="md:col-span-2">
                      <VideoTile
                        stream={screenStream}
                        name="Screen Share"
                        isScreenShare
                        className="h-full"
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
                  
                  {participants.map((participant) => (
                    <VideoTile
                      key={participant.id}
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
                  onStudentResponse={handleAnswerSubmitted}
                />
              )}

              {/* Student: Response Panel */}
              {!isHost && user && profile && (
                <StudentResponsePanel
                  sessionId={activeSession.id}
                  studentId={user.id}
                  studentName={profile.name}
                />
              )}

              {/* Teacher: Raised Hands Panel */}
              {isHost && (
                <TeacherRaisedHandsPanel
                  sessionId={activeSession.id}
                  onCallStudent={handleCallStudent}
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

              {/* Live Session Diagnostics - for debugging */}
              {user && (
                <LiveSessionDiagnostic 
                  sessionId={activeSession.id}
                  userId={user.id}
                  isHost={isHost}
                />
              )}

              {/* Live Sign Detection Feed - for all users */}
              {user && profile && (
                <LiveSignDetectionFeed 
                  sessionId={activeSession.id}
                  participantId={user.id}
                  participantName={profile.name}
                  className="max-h-[400px]"
                />
              )}

              {/* Sign to Communicate - for all users */}
              <SignToCommunicate className="max-h-[300px]" />
              
              {/* Speech Test - for debugging */}
              <SpeechTest />
            </div>
          </div>

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

        <SpeechTest />

        {/* Simple Speech Test */}
        <SimpleSpeechTest />

        {/* Text-to-Speech Test */}
        <TextToSpeechTest />

        {/* Audio System Test */}
        <AudioTest />

        {/* Fixed Speech Test */}
        <FixedSpeechTest />

        {/* Camera Diagnostics */}
        <CameraDiagnostic />

        {/* Recording Diagnostics */}
        <RecordingDiagnostic />


      </div>
    </DashboardLayout>
  );
}