import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle,
  LogIn,
  LogOut 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  duration_minutes: number;
}

interface SessionAttendancePanelProps {
  sessionId: string;
  sessionTitle: string;
  isHost: boolean;
}

export function SessionAttendancePanel({ 
  sessionId, 
  sessionTitle,
  isHost 
}: SessionAttendancePanelProps) {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch attendance data
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const records: AttendanceRecord[] = (data || []).map((p) => {
        const joinedAt = new Date(p.joined_at);
        const leftAt = p.left_at ? new Date(p.left_at) : new Date();
        const durationMs = leftAt.getTime() - joinedAt.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        return {
          id: p.id,
          user_id: p.user_id,
          user_name: p.user_name,
          joined_at: p.joined_at,
          left_at: p.left_at,
          is_active: p.is_active,
          duration_minutes: durationMinutes,
        };
      });

      setAttendance(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAttendance();

    // Subscribe to participant updates
    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchAttendance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const generateCSVReport = () => {
    const headers = ['Name', 'Joined At', 'Left At', 'Duration (min)', 'Status'];
    const rows = attendance.map((record) => [
      record.user_name,
      new Date(record.joined_at).toISOString(),
      record.left_at ? new Date(record.left_at).toISOString() : 'Still Active',
      record.duration_minutes.toString(),
      record.is_active ? 'Active' : 'Left',
    ]);

    const csvContent = [
      `Session: ${sessionTitle}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Total Participants: ${attendance.length}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${sessionTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Attendance report saved as CSV",
    });
  };

  const activeCount = attendance.filter(r => r.is_active).length;
  const totalDuration = attendance.reduce((sum, r) => sum + r.duration_minutes, 0);
  const avgDuration = attendance.length > 0 ? Math.round(totalDuration / attendance.length) : 0;

  if (!isHost) {
    // Students just see a simple badge
    return null;
  }

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Attendance
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateCSVReport}
            disabled={attendance.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-secondary/50 rounded-lg p-2">
            <div className="text-2xl font-bold">{attendance.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-success/20 rounded-lg p-2">
            <div className="text-2xl font-bold text-success">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-2">
            <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            <div className="text-xs text-muted-foreground">Avg Time</div>
          </div>
        </div>

        {/* Attendance Table */}
        {attendance.length > 0 ? (
          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.user_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <LogIn className="w-3 h-3" />
                        {formatTime(record.joined_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatDuration(record.duration_minutes)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <LogOut className="w-3 h-3" />
                          {record.left_at ? formatTime(record.left_at) : 'Left'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No participants yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
