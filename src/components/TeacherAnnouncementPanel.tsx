import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Send, Volume2 } from 'lucide-react';

interface TeacherAnnouncementPanelProps {
  sessionId: string;
  teacherId: string;
}

const QUICK_MESSAGES = [
  { label: '👋 Welcome', text: 'Welcome to the class! Please make sure your camera is on.' },
  { label: '🤫 Quiet', text: 'Please pay attention to the lesson.' },
  { label: '✋ Question', text: 'Raise your hand if you have a question!' },
  { label: '👏 Great job', text: 'Great job everyone! Keep up the good work!' },
  { label: '⏰ Break', text: 'We will take a short 5-minute break.' },
  { label: '📝 Practice', text: 'Now it\'s time to practice. Show me the sign!' },
];

export function TeacherAnnouncementPanel({
  sessionId,
  teacherId,
}: TeacherAnnouncementPanelProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendAnnouncement = async (text: string) => {
    if (!text.trim()) return;

    setIsSending(true);
    try {
      await supabase.from('teacher_messages').insert({
        session_id: sessionId,
        teacher_id: teacherId,
        content: text.trim(),
        message_type: 'announcement',
      });

      setMessage('');
      toast({
        title: 'Announcement Sent',
        description: 'Your message has been broadcast to all students.',
      });
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to send announcement.',
        variant: 'destructive',
      });
    }
    setIsSending(false);
  };

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick message buttons */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_MESSAGES.map((qm) => (
            <Button
              key={qm.label}
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => sendAnnouncement(qm.text)}
              disabled={isSending}
            >
              {qm.label}
            </Button>
          ))}
        </div>

        {/* Custom message */}
        <div className="space-y-2">
          <Textarea
            placeholder="Type a custom announcement..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            disabled={isSending}
          />
          <Button
            onClick={() => sendAnnouncement(message)}
            disabled={!message.trim() || isSending}
            className="w-full"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Broadcast to All Students
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
