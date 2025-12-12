import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Calendar, Video, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Recording {
  id: string;
  title: string;
  duration: number;
  recorded_at: string;
  status: string;
  session_id: string;
  recording_url: string | null;
}

export function SessionRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  useEffect(() => {
    fetchRecordings();

    const channel = supabase
      .channel('recordings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_recordings',
        },
        () => fetchRecordings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecordings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('session_recordings')
      .select('*')
      .eq('status', 'completed')
      .order('recorded_at', { ascending: false });

    if (data) {
      setRecordings(data);
    }
    setIsLoading(false);
  };

  const playRecording = (recording: Recording) => {
    setSelectedRecording(recording);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Past Session Recordings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recordings available yet</p>
              <p className="text-sm mt-1">Recorded sessions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{recording.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(recording.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(recording.recorded_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recording.recording_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={recording.recording_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playRecording(recording)}
                      disabled={!recording.recording_url}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Watch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecording} onOpenChange={() => setSelectedRecording(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedRecording?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedRecording?.recording_url ? (
              <video
                src={selectedRecording.recording_url}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-2" />
                  <p>Recording not available</p>
                </div>
              </div>
            )}
          </div>
          {selectedRecording && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(selectedRecording.duration)}
              </Badge>
              <span>{formatDate(selectedRecording.recorded_at)}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
