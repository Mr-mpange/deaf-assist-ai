import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { mockSubmissions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Video, 
  Eye, 
  CheckCircle2, 
  Clock,
  MessageSquare,
  User,
  Sparkles,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

export default function TeacherSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<typeof mockSubmissions[0] | null>(null);
  const [feedback, setFeedback] = useState('');

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleReview = () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback for the student",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Review Submitted",
      description: `Feedback sent to ${selectedSubmission?.studentName}`,
    });
    setSelectedSubmission(null);
    setFeedback('');
  };

  const statusColors = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    reviewed: 'bg-info/10 text-info border-info/20',
    approved: 'bg-success/10 text-success border-success/20',
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            Student Submissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and provide feedback on student practice videos
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockSubmissions.filter(s => s.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockSubmissions.filter(s => s.status === 'reviewed').length}
                </p>
                <p className="text-sm text-muted-foreground">Reviewed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockSubmissions.filter(s => s.status === 'approved').length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {mockSubmissions.map((submission) => (
            <Card 
              key={submission.id} 
              className="border-border/50 shadow-card hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Video Preview */}
                  <div className="relative w-full sm:w-40 aspect-video bg-muted rounded-lg overflow-hidden shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-foreground/50 flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{submission.lessonTitle}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          {submission.studentName}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize", statusColors[submission.status])}
                      >
                        {submission.status}
                      </Badge>
                    </div>

                    {/* AI Prediction */}
                    {submission.aiPrediction && (
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>
                          AI detected: <strong>{submission.aiPrediction.sign}</strong>
                          {' '}({Math.round(submission.aiPrediction.confidence * 100)}% confidence)
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>

                    {submission.feedback && (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-1">Your feedback:</p>
                        <p className="text-muted-foreground">{submission.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Submission</DialogTitle>
              <DialogDescription>
                {selectedSubmission?.studentName} - {selectedSubmission?.lessonTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Video Player Placeholder */}
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground">Video Player (Demo)</p>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedSubmission?.aiPrediction && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">AI Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        Detected sign: <strong>{selectedSubmission.aiPrediction.sign}</strong>
                        {' '}with {Math.round(selectedSubmission.aiPrediction.confidence * 100)}% confidence
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Feedback */}
              <div className="space-y-2">
                <label className="font-medium">Your Feedback</label>
                <Textarea
                  placeholder="Provide constructive feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleReview}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
