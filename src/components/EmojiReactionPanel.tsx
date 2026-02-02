import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EmojiReaction {
  id: string;
  emoji: string;
  participant_id: string;
  participant_name: string;
  created_at: string;
}

interface EmojiReactionPanelProps {
  sessionId: string;
  participantId: string;
  participantName: string;
}

const AVAILABLE_EMOJIS = ['👏', '🎉', '✅', '❌', '👍', '❤️', '🔥', '💡'];

export function EmojiReactionPanel({
  sessionId,
  participantId,
  participantName,
}: EmojiReactionPanelProps) {
  const [recentReactions, setRecentReactions] = useState<EmojiReaction[]>([]);
  const [isAnimating, setIsAnimating] = useState<string | null>(null);

  // Subscribe to emoji reactions in real-time
  useEffect(() => {
    const channel = supabase
      .channel(`emoji-reactions-${sessionId}`)
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
          // Check if this is an emoji reaction (sign_text starts with emoji)
          if (AVAILABLE_EMOJIS.includes(data.sign_text)) {
            const reaction: EmojiReaction = {
              id: data.id,
              emoji: data.sign_text,
              participant_id: data.participant_id,
              participant_name: data.participant_name,
              created_at: data.created_at,
            };
            setRecentReactions((prev) => [reaction, ...prev.slice(0, 9)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Clean up old reactions after 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      setRecentReactions((prev) =>
        prev.filter((r) => r.created_at > fiveSecondsAgo)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendReaction = async (emoji: string) => {
    setIsAnimating(emoji);
    setTimeout(() => setIsAnimating(null), 300);

    try {
      await supabase.from('sign_messages').insert({
        session_id: sessionId,
        participant_id: participantId,
        participant_name: participantName,
        sign_text: emoji,
        confidence: 1.0,
      });
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">React</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Emoji buttons */}
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className={cn(
                'h-10 w-10 text-xl p-0 transition-transform hover:scale-125',
                isAnimating === emoji && 'scale-150'
              )}
              onClick={() => sendReaction(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>

        {/* Recent reactions feed */}
        {recentReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
            {recentReactions.map((reaction) => (
              <div
                key={reaction.id}
                className="animate-in fade-in zoom-in duration-300 flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
              >
                <span className="text-base">{reaction.emoji}</span>
                <span className="text-muted-foreground truncate max-w-[60px]">
                  {reaction.participant_name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
