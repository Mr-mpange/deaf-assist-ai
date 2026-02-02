import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Star, X, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedStudent {
  id: string;
  student_id: string;
  student_name: string;
  detected_sign: string | null;
  confidence: number | null;
  response_content: string | null;
}

interface FeaturedStudentSpotlightProps {
  sessionId: string;
  isHost: boolean;
  participants: Array<{
    id: string;
    name: string;
    stream?: MediaStream | null;
  }>;
  onDismiss?: () => void;
}

export function FeaturedStudentSpotlight({
  sessionId,
  isHost,
  participants,
  onDismiss,
}: FeaturedStudentSpotlightProps) {
  const [featured, setFeatured] = useState<FeaturedStudent | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subscribe to featured student changes
  useEffect(() => {
    // Fetch current featured student
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('student_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setFeatured({
          id: data.id,
          student_id: data.student_id,
          student_name: data.student_name,
          detected_sign: data.detected_sign,
          confidence: data.confidence,
          response_content: data.response_content,
        });
      }
    };

    fetchFeatured();

    const channel = supabase
      .channel(`featured-student-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_responses',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = payload.new as any;
            if (data.is_featured) {
              setFeatured({
                id: data.id,
                student_id: data.student_id,
                student_name: data.student_name,
                detected_sign: data.detected_sign,
                confidence: data.confidence,
                response_content: data.response_content,
              });
            } else if (featured?.id === data.id) {
              setFeatured(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, featured?.id]);

  // Set up video stream for featured student
  useEffect(() => {
    if (featured && videoRef.current) {
      const participant = participants.find((p) => p.id === featured.student_id);
      if (participant?.stream) {
        videoRef.current.srcObject = participant.stream;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [featured, participants]);

  const handleDismiss = async () => {
    if (featured && isHost) {
      await supabase
        .from('student_responses')
        .update({ is_featured: false })
        .eq('id', featured.id);
      setFeatured(null);
      onDismiss?.();
    }
  };

  if (!featured) return null;

  const participant = participants.find((p) => p.id === featured.student_id);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl border-primary shadow-2xl animate-in zoom-in-90 duration-300">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary fill-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{featured.student_name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Hand className="w-3 h-3" /> Answering now
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="animate-pulse">
                🔴 LIVE
              </Badge>
              {isHost && (
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Video area */}
          <div className="relative aspect-video bg-black">
            {participant?.stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-primary">
                    {featured.student_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-muted-foreground">Waiting for video...</p>
              </div>
            )}

            {/* Sign detection overlay */}
            {featured.detected_sign && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-background/90 backdrop-blur rounded-lg p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Detected Sign</p>
                      <p className="text-2xl font-bold text-primary">
                        {featured.detected_sign}
                      </p>
                    </div>
                    {featured.confidence && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className={cn(
                          "text-xl font-semibold",
                          featured.confidence > 0.8 ? "text-green-500" :
                          featured.confidence > 0.5 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {Math.round(featured.confidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with response info */}
          {featured.response_content && (
            <div className="p-4 border-t border-border/50 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Response:</p>
              <p className="font-medium">{featured.response_content}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
