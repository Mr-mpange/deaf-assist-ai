import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  createdAt: number;
}

interface FloatingEmojiOverlayProps {
  sessionId: string;
}

const AVAILABLE_EMOJIS = ['👏', '🎉', '✅', '❌', '👍', '❤️', '🔥', '💡'];

export function FloatingEmojiOverlay({ sessionId }: FloatingEmojiOverlayProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  // Subscribe to emoji reactions
  useEffect(() => {
    const channel = supabase
      .channel(`floating-emojis-${sessionId}`)
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
          if (AVAILABLE_EMOJIS.includes(data.sign_text)) {
            const newEmoji: FloatingEmoji = {
              id: data.id,
              emoji: data.sign_text,
              x: Math.random() * 80 + 10, // Random position 10-90%
              createdAt: Date.now(),
            };
            setFloatingEmojis((prev) => [...prev, newEmoji]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Remove emojis after animation completes
  useEffect(() => {
    const interval = setInterval(() => {
      const threeSecondsAgo = Date.now() - 3000;
      setFloatingEmojis((prev) =>
        prev.filter((e) => e.createdAt > threeSecondsAgo)
      );
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {floatingEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className={cn(
            "absolute text-4xl animate-float-up",
            "drop-shadow-lg"
          )}
          style={{
            left: `${emoji.x}%`,
            bottom: '0%',
          }}
        >
          {emoji.emoji}
        </div>
      ))}

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-50vh) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) scale(0.8);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
