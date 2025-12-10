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
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
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
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isTeacher = role === 'teacher' || role === 'admin';

  const {
    localStream,
    participants,
    isConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenStream,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    addDemoParticipant,
  } = useWebRTC({
    roomId: activeSession?.id || '',
    userId: user?.id || '',
    userName: profile?.name || 'Anonymous',
    isHost: activeSession?.host_id === user?.id,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('live_sessions')
      .select(`
        *,
        host:profiles!live_sessions_host_id_fkey(name)
      `)
      .in('status', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true });
    
    if (data) {
      setSessions(data.map(s => ({
        ...s,
        host_name: (s.host as any)?.name || 'Unknown Host',
      })));
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
    
    // Start the call
    await startCall();
    
    toast({
      title: "Session Created",
      description: `"${data.title}" is now live!`,
    });
    
    fetchSessions();
  };

  const handleJoinSession = async (session: LiveSession) => {
    setActiveSession(session);
    await startCall();
  };

  const handleEndSession = async () => {
    if (activeSession && activeSession.host_id === user?.id) {
      await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
    }
    
    endCall();
    setActiveSession(null);
    fetchSessions();
  };

  const liveSessions = sessions.filter(s => s.status === 'live');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');

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

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Screen Share (if active) */}
            {isScreenSharing && screenStream && (
              <div className="md:col-span-2 lg:col-span-2">
                <VideoTile
                  stream={screenStream}
                  name="Screen Share"
                  isScreenShare
                  className="h-full"
                />
              </div>
            )}
            
            {/* Participants */}
            {participants.map((participant) => (
              <VideoTile
                key={participant.id}
                stream={participant.stream}
                name={participant.name}
                isHost={participant.isHost}
                isMuted={participant.id === user?.id ? isMuted : participant.isMuted}
                isVideoOff={participant.id === user?.id ? isVideoOff : participant.isVideoOff}
                isLocal={participant.id === user?.id}
              />
            ))}
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

                {/* Demo: Add participant button */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => addDemoParticipant(`Student ${participants.length}`)}
                >
                  <UserPlus className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleEndSession}
                >
                  <PhoneOff className="w-5 h-5 mr-2" />
                  {activeSession.host_id === user?.id ? 'End Session' : 'Leave'}
                </Button>
              </div>
            </CardContent>
          </Card>

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
              Join live classes or start your own session
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
                      {session.participants_count}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold">{session.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        with {session.host_name}
                      </p>
                    </div>
                    <Button 
                      className="w-full" 
                      variant="gradient"
                      onClick={() => handleJoinSession(session)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
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
          
          {scheduledSessions.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledSessions.map((session) => (
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

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Live Session Features</h3>
                <p className="text-sm text-muted-foreground">
                  Join live classes to interact with instructors in real-time. 
                  Ask questions, practice signs, and get immediate feedback.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Video Chat</Badge>
                <Badge variant="secondary">Screen Share</Badge>
                <Badge variant="secondary">Q&A</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
