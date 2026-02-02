import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  content: string;
  participant_id: string;
  participant_name: string;
  created_at: string;
}

interface SessionChatPanelProps {
  sessionId: string;
  participantId: string;
  participantName: string;
  isHost?: boolean;
}

export function SessionChatPanel({
  sessionId,
  participantId,
  participantName,
  isHost = false,
}: SessionChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages and subscribe to new ones
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('sign_messages')
        .select('*')
        .eq('session_id', sessionId)
        .not('sign_text', 'in', '("👏","🎉","✅","❌","👍","❤️","🔥","💡")') // Exclude emoji reactions
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            content: m.sign_text,
            participant_id: m.participant_id,
            participant_name: m.participant_name,
            created_at: m.created_at,
          }))
        );
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sign_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const data = payload.new as any;
          // Only add non-emoji messages
          const emojis = ['👏', '🎉', '✅', '❌', '👍', '❤️', '🔥', '💡'];
          if (!emojis.includes(data.sign_text)) {
            const msg: ChatMessage = {
              id: data.id,
              content: data.sign_text,
              participant_id: data.participant_id,
              participant_name: data.participant_name,
              created_at: data.created_at,
            };
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await supabase.from('sign_messages').insert({
        session_id: sessionId,
        participant_id: participantId,
        participant_name: participantName,
        sign_text: newMessage.trim(),
        confidence: 1.0,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-border/50 shadow-card flex flex-col h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-3 py-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.participant_id === participantId && 'items-end'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.participant_id === participantId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {msg.participant_id !== participantId && (
                      <p className="text-xs font-medium mb-1 opacity-80">
                        {msg.participant_name}
                      </p>
                    )}
                    <p className="break-words">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-3 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="flex-1 h-9 text-sm"
            />
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className="h-9 w-9 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
