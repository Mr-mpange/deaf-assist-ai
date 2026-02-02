import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

interface StudentAnnouncementListenerProps {
  sessionId: string;
}

export function StudentAnnouncementListener({ sessionId }: StudentAnnouncementListenerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { toast } = useToast();
  const { playSound } = useNotificationSound();

  useEffect(() => {
    const channel = supabase
      .channel(`announcements-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teacher_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data.message_type === 'announcement') {
            playSound('called');
            setAnnouncements((prev) => [
              {
                id: data.id,
                content: data.content,
                created_at: data.created_at,
              },
              ...prev,
            ]);

            toast({
              title: '📢 Announcement',
              description: data.content,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, toast, playSound]);

  // Auto-dismiss announcements after 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
      setAnnouncements((prev) =>
        prev.filter((a) => a.created_at > fifteenSecondsAgo)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const dismissAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (announcements.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-full max-w-lg px-4 space-y-2">
      {announcements.map((announcement, index) => (
        <div
          key={announcement.id}
          className={cn(
            "bg-primary text-primary-foreground rounded-lg shadow-lg p-4",
            "animate-in slide-in-from-top duration-300",
            "flex items-start gap-3"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-80 mb-1">Teacher Announcement</p>
            <p className="text-sm font-medium">{announcement.content}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => dismissAnnouncement(announcement.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
