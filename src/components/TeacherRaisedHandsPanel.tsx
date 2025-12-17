import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Hand, 
  UserCheck, 
  XCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RaisedHand {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  status: string;
  raised_at: string;
  called_at: string | null;
  answer_sign: string | null;
  answer_confidence: number | null;
  current_sign: string | null;
  current_confidence: number | null;
  last_detected_at: string | null;
}

interface TeacherRaisedHandsPanelProps {
  sessionId: string;
  onCallStudent: (studentId: string) => void;
}

export function TeacherRaisedHandsPanel({
  sessionId,
  onCallStudent,
}: TeacherRaisedHandsPanelProps) {
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [currentlyCalledId, setCurrentlyCalledId] = useState<string | null>(null);
  const { toast } = useToast();

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  useEffect(() => {
    fetchRaisedHands();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`raised-hands-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raised_hands',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New raised hand:', payload);
          const newHand = payload.new as RaisedHand;
          
          // Show notification
          toast({
            title: "🙋 Student Raised Hand!",
            description: `${newHand.student_name} wants to answer`,
            duration: 5000,
          });
          
          // Play sound
          playNotificationSound();
          
          fetchRaisedHands();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raised_hands',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Raised hand updated:', payload);
          const updatedHand = payload.new as RaisedHand;
          
          // Notify when student answers
          if (updatedHand.status === 'answered' && updatedHand.answer_sign) {
            toast({
              title: "✅ Student Answered!",
              description: `${updatedHand.student_name} signed: ${updatedHand.answer_sign}`,
              duration: 5000,
            });
            playNotificationSound();
          }
          
          fetchRaisedHands();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'raised_hands',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchRaisedHands();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, toast]);

  const fetchRaisedHands = async () => {
    const { data, error } = await supabase
      .from('raised_hands')
      .select('*')
      .eq('session_id', sessionId)
      .order('raised_at', { ascending: true });

    if (data) {
      setRaisedHands(data);
    }
  };

  const handleCallOnStudent = async (hand: RaisedHand) => {
    try {
      const { error } = await supabase
        .from('raised_hands')
        .update({
          status: 'called',
          called_at: new Date().toISOString(),
        })
        .eq('id', hand.id);

      if (error) throw error;

      setCurrentlyCalledId(hand.student_id);
      onCallStudent(hand.student_id);
      
      toast({
        title: "Student Called",
        description: `${hand.student_name} can now answer`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to call on student",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = async (hand: RaisedHand) => {
    try {
      await supabase
        .from('raised_hands')
        .delete()
        .eq('id', hand.id);
      
      if (currentlyCalledId === hand.student_id) {
        setCurrentlyCalledId(null);
      }
    } catch (err) {
      console.error('Error dismissing:', err);
    }
  };

  const raisedCount = raisedHands.filter(h => h.status === 'raised').length;
  const answeredCount = raisedHands.filter(h => h.status === 'answered').length;

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Hand className="w-5 h-5" />
            Raised Hands
          </span>
          {raisedCount > 0 && (
            <Badge variant="secondary" className="animate-pulse">
              {raisedCount} waiting
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {raisedHands.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Hand className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No students have raised their hands yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {raisedHands.map((hand) => (
                <div
                  key={hand.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    hand.status === 'called' && "bg-primary/5 border-primary",
                    hand.status === 'answered' && "bg-success/5 border-success",
                    hand.status === 'raised' && "bg-muted/50 border-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{hand.student_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(hand.raised_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        hand.status === 'answered' ? 'default' :
                        hand.status === 'called' ? 'secondary' : 'outline'
                      }
                    >
                      {hand.status === 'answered' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {hand.status}
                    </Badge>
                  </div>

                  {/* Real-time sign detection (when called on) */}
                  {hand.status === 'called' && hand.current_sign && (
                    <div className="mb-3 p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {hand.current_sign}
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs border-blue-500/30">
                          {Math.round((hand.current_confidence || 0) * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Live detection • Waiting for submit
                      </p>
                    </div>
                  )}

                  {/* Final answer (when answered) */}
                  {hand.status === 'answered' && hand.answer_sign && (
                    <div className="mb-3 p-2 bg-success/10 rounded-md">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-success" />
                        <span className="font-semibold">{hand.answer_sign}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {Math.round((hand.answer_confidence || 0) * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Final answer
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {hand.status === 'raised' && (
                      <Button
                        size="sm"
                        variant="gradient"
                        className="flex-1"
                        onClick={() => handleCallOnStudent(hand)}
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Call On
                      </Button>
                    )}
                    {hand.status === 'called' && (
                      <div className="flex-1 text-sm text-muted-foreground italic">
                        Waiting for student to answer...
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismiss(hand)}
                      title="Dismiss"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {answeredCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {answeredCount} student{answeredCount > 1 ? 's' : ''} answered this session
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}