import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BarChart3, Plus, X, Send, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  totalVotes: number;
}

interface SessionPollPanelProps {
  sessionId: string;
  participantId: string;
  participantName: string;
  isHost: boolean;
}

export function SessionPollPanel({ 
  sessionId, 
  participantId, 
  participantName, 
  isHost 
}: SessionPollPanelProps) {
  const { toast } = useToast();
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);

  // Subscribe to poll updates via realtime
  useEffect(() => {
    const channel = supabase
      .channel(`poll-${sessionId}`)
      .on('broadcast', { event: 'poll_update' }, (payload) => {
        const poll = payload.payload as Poll;
        setActivePoll(poll);
        
        // Check if current user has already voted
        if (poll && !isHost) {
          const storedVotes = localStorage.getItem(`poll_votes_${sessionId}`);
          if (storedVotes) {
            const votes = JSON.parse(storedVotes);
            if (votes[poll.id]) {
              setHasVoted(true);
              setSelectedOption(votes[poll.id]);
            } else {
              setHasVoted(false);
              setSelectedOption('');
            }
          }
        }
      })
      .on('broadcast', { event: 'poll_ended' }, () => {
        setActivePoll(null);
        setHasVoted(false);
        setSelectedOption('');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isHost]);

  const createPoll = async () => {
    const validOptions = newOptions.filter(opt => opt.trim());
    if (!newQuestion.trim() || validOptions.length < 2) {
      toast({
        title: "Invalid Poll",
        description: "Please add a question and at least 2 options",
        variant: "destructive",
      });
      return;
    }

    const poll: Poll = {
      id: crypto.randomUUID(),
      question: newQuestion,
      options: validOptions.map((text, index) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D
        text,
        votes: 0,
      })),
      isActive: true,
      totalVotes: 0,
    };

    // Broadcast poll to all participants
    await supabase
      .channel(`poll-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'poll_update',
        payload: poll,
      });

    setActivePoll(poll);
    setIsCreating(false);
    setNewQuestion('');
    setNewOptions(['', '', '', '']);

    toast({
      title: "Poll Created",
      description: "Students can now vote!",
    });
  };

  const submitVote = async () => {
    if (!selectedOption || !activePoll) return;

    // Update local poll state
    const updatedPoll = {
      ...activePoll,
      options: activePoll.options.map(opt => 
        opt.id === selectedOption 
          ? { ...opt, votes: opt.votes + 1 }
          : opt
      ),
      totalVotes: activePoll.totalVotes + 1,
    };

    // Store vote in localStorage to prevent double voting
    const storedVotes = localStorage.getItem(`poll_votes_${sessionId}`);
    const votes = storedVotes ? JSON.parse(storedVotes) : {};
    votes[activePoll.id] = selectedOption;
    localStorage.setItem(`poll_votes_${sessionId}`, JSON.stringify(votes));

    // Broadcast updated poll
    await supabase
      .channel(`poll-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'poll_update',
        payload: updatedPoll,
      });

    setHasVoted(true);
    setActivePoll(updatedPoll);

    toast({
      title: "Vote Submitted!",
      description: `You voted for option ${selectedOption}`,
    });
  };

  const endPoll = async () => {
    await supabase
      .channel(`poll-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'poll_ended',
        payload: {},
      });

    setActivePoll(null);
    toast({
      title: "Poll Ended",
      description: "Results have been finalized",
    });
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  // Host: Create poll UI
  if (isHost && isCreating) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Create Poll
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              placeholder="What sign means 'hello'?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Options (2-4)</Label>
            {newOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="outline" className="w-8 justify-center">
                  {String.fromCharCode(65 + i)}
                </Badge>
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          <Button onClick={createPoll} className="w-full" variant="gradient">
            <Send className="w-4 h-4 mr-2" />
            Start Poll
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Host: Show poll controls and results
  if (isHost) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Poll / Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activePoll ? (
            <>
              <div className="space-y-2">
                <p className="font-medium">{activePoll.question}</p>
                <Badge variant="secondary">{activePoll.totalVotes} votes</Badge>
              </div>
              
              <div className="space-y-3">
                {activePoll.options.map((option) => {
                  const percentage = activePoll.totalVotes > 0 
                    ? (option.votes / activePoll.totalVotes) * 100 
                    : 0;
                  return (
                    <div key={option.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 justify-center">
                            {option.id}
                          </Badge>
                          {option.text}
                        </span>
                        <span className="text-muted-foreground">
                          {option.votes} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>

              <Button onClick={endPoll} variant="destructive" className="w-full">
                End Poll
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Create New Poll
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Student: Vote UI
  if (activePoll) {
    return (
      <Card className="border-primary/30 shadow-card bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Poll Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-medium">{activePoll.question}</p>
          
          {hasVoted ? (
            <>
              <div className="flex items-center gap-2 text-success">
                <Check className="w-5 h-5" />
                <span>You voted for option {selectedOption}</span>
              </div>
              
              <div className="space-y-3">
                {activePoll.options.map((option) => {
                  const percentage = activePoll.totalVotes > 0 
                    ? (option.votes / activePoll.totalVotes) * 100 
                    : 0;
                  return (
                    <div key={option.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge 
                            variant={option.id === selectedOption ? "default" : "outline"} 
                            className="w-6 h-6 p-0 justify-center"
                          >
                            {option.id}
                          </Badge>
                          {option.text}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                {activePoll.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex items-center gap-2 cursor-pointer">
                      <Badge variant="outline" className="w-6 h-6 p-0 justify-center">
                        {option.id}
                      </Badge>
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <Button 
                onClick={submitVote} 
                disabled={!selectedOption}
                className="w-full"
                variant="gradient"
              >
                Submit Vote
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // No active poll for students
  return null;
}
