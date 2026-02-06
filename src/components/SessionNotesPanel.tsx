import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Save, 
  Share2, 
  Download,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionNotesPanelProps {
  sessionId: string;
  participantId: string;
  participantName: string;
  isHost: boolean;
}

interface SharedNote {
  id: string;
  content: string;
  sharedAt: string;
  teacherName: string;
}

export function SessionNotesPanel({
  sessionId,
  participantId,
  participantName,
  isHost,
}: SessionNotesPanelProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [isShared, setIsShared] = useState(false);

  // Load saved notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`session_notes_${sessionId}`);
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, [sessionId]);

  // Subscribe to shared notes
  useEffect(() => {
    const channel = supabase
      .channel(`notes-${sessionId}`)
      .on('broadcast', { event: 'notes_shared' }, (payload) => {
        const note = payload.payload as SharedNote;
        setSharedNotes(prev => {
          const exists = prev.some(n => n.id === note.id);
          if (exists) {
            return prev.map(n => n.id === note.id ? note : n);
          }
          return [...prev, note];
        });
        
        if (!isHost) {
          toast({
            title: "Notes Shared",
            description: "Teacher shared new session notes",
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isHost, toast]);

  // Auto-save notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes && isHost) {
        localStorage.setItem(`session_notes_${sessionId}`, notes);
        setLastSaved(new Date());
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, sessionId, isHost]);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem(`session_notes_${sessionId}`, notes);
    setLastSaved(new Date());
    setTimeout(() => setIsSaving(false), 500);
    
    toast({
      title: "Notes Saved",
      description: "Your notes have been saved locally",
    });
  };

  const handleShare = async () => {
    const sharedNote: SharedNote = {
      id: crypto.randomUUID(),
      content: notes,
      sharedAt: new Date().toISOString(),
      teacherName: participantName,
    };

    await supabase
      .channel(`notes-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'notes_shared',
        payload: sharedNote,
      });

    setIsShared(true);
    setSharedNotes(prev => [...prev, sharedNote]);

    toast({
      title: "Notes Shared",
      description: "Notes have been shared with all students",
    });
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Host view - note taking
  if (isHost) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Session Notes
            </span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Take notes during the session...

• Key concepts covered
• Student questions
• Practice exercises
• Homework assignments"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[200px] resize-none"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={handleShare}
              disabled={!notes.trim()}
              className="flex-1"
              variant="gradient"
            >
              {isShared ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Update Share
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-1" />
                  Share with Students
                </>
              )}
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => handleDownload(notes, `session-notes-${sessionId}.txt`)}
            disabled={!notes.trim()}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-1" />
            Download Notes
          </Button>

          {isShared && (
            <div className="flex items-center gap-2 text-xs text-success">
              <Eye className="w-3 h-3" />
              Notes are visible to students
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Student view - view shared notes
  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Session Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sharedNotes.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-4">
              {sharedNotes.map((note) => (
                <div key={note.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      From {note.teacherName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.sharedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {note.content}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(
                      note.content, 
                      `notes-${new Date(note.sharedAt).toLocaleDateString()}.txt`
                    )}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes shared yet</p>
            <p className="text-xs">The teacher will share notes during or after the session</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
