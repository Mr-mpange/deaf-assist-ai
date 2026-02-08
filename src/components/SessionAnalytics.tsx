import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Clock, Download, TrendingUp, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SessionAnalyticsProps {
  sessionId: string;
  sessionTitle: string;
}

interface AttendeeData {
  user_name: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number;
}

interface PollResult {
  question: string;
  options: { text: string; votes: number; percentage: number }[];
  totalVotes: number;
}

export function SessionAnalytics({ sessionId, sessionTitle }: SessionAnalyticsProps) {
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [raisedHandCount, setRaisedHandCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [sessionId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch session info
      const { data: session } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (session) {
        const start = new Date(session.scheduled_at);
        const end = session.ended_at ? new Date(session.ended_at) : new Date();
        setSessionDuration(Math.round((end.getTime() - start.getTime()) / 60000));
      }

      // Fetch participants
      const { data: participants } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId);

      if (participants) {
        setAttendees(participants.map(p => {
          const joined = new Date(p.joined_at);
          const left = p.left_at ? new Date(p.left_at) : new Date();
          return {
            user_name: p.user_name,
            joined_at: p.joined_at,
            left_at: p.left_at,
            duration_minutes: Math.round((left.getTime() - joined.getTime()) / 60000),
          };
        }));
      }

      // Fetch message count
      const { count: msgCount } = await supabase
        .from('sign_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      setMessageCount(msgCount || 0);

      // Fetch response count
      const { count: respCount } = await supabase
        .from('student_responses')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      setResponseCount(respCount || 0);

      // Fetch raised hands count
      const { count: handCount } = await supabase
        .from('raised_hands')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      setRaisedHandCount(handCount || 0);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setIsLoading(false);
  };

  const avgAttendanceDuration = attendees.length > 0
    ? Math.round(attendees.reduce((sum, a) => sum + a.duration_minutes, 0) / attendees.length)
    : 0;

  const engagementScore = Math.min(100, Math.round(
    ((messageCount * 2) + (responseCount * 5) + (raisedHandCount * 3)) / Math.max(1, attendees.length)
  ));

  const downloadReport = () => {
    const lines = [
      `Session Analytics Report`,
      `========================`,
      `Session: ${sessionTitle}`,
      `Duration: ${sessionDuration} minutes`,
      `Total Attendees: ${attendees.length}`,
      `Avg Attendance: ${avgAttendanceDuration} minutes`,
      `Messages: ${messageCount}`,
      `Responses: ${responseCount}`,
      `Raised Hands: ${raisedHandCount}`,
      `Engagement Score: ${engagementScore}/100`,
      ``,
      `Attendee Details`,
      `----------------`,
      ...attendees.map(a => 
        `${a.user_name} - ${a.duration_minutes}min (Joined: ${new Date(a.joined_at).toLocaleTimeString()})`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-analytics-${sessionId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Session Analytics
          </span>
          <Button variant="outline" size="sm" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{sessionDuration}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{attendees.length}</p>
                <p className="text-xs text-muted-foreground">Attendees</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{messageCount}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{engagementScore}</p>
                <p className="text-xs text-muted-foreground">Engagement</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Avg duration: {avgAttendanceDuration} min</span>
              <Badge variant="outline">{attendees.length} total</Badge>
            </div>
            {attendees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance data</p>
            ) : (
              attendees.map((a, i) => {
                const pct = sessionDuration > 0 ? Math.min(100, (a.duration_minutes / sessionDuration) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{a.user_name}</span>
                      <span className="text-muted-foreground">{a.duration_minutes} min</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="engagement" className="space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Sign Messages</span>
                <Badge variant="secondary">{messageCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Student Responses</span>
                <Badge variant="secondary">{responseCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Raised Hands</span>
                <Badge variant="secondary">{raisedHandCount}</Badge>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">Engagement Score</span>
                  <span className="font-bold text-primary">{engagementScore}/100</span>
                </div>
                <Progress value={engagementScore} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Based on messages, responses, and participation
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
