import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { mockSubmissions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Play,
  Star,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Search,
  Download,
  Volume2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

export default function TeacherSubmissions() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<typeof mockSubmissions[0] | null>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Role protection is handled by the route, but double-check here
  if (role !== 'teacher' && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Filter submissions based on status and search term
  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      submission.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleReview = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback for the student",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSubmission) return;

    setIsReviewing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update submission with feedback and rating
    const updatedSubmissions = submissions.map(sub => 
      sub.id === selectedSubmission.id 
        ? { 
            ...sub, 
            status: 'reviewed' as const,
            feedback,
            rating,
            reviewedAt: new Date().toISOString()
          }
        : sub
    );
    
    // Update submissions and force re-render
    setSubmissions(updatedSubmissions);
    setRefreshKey(prev => prev + 1);

    toast({
      title: "Review Submitted",
      description: `Feedback sent to ${selectedSubmission?.studentName}`,
    });
    
    setSelectedSubmission(null);
    setFeedback('');
    setRating(0);
    setIsReviewing(false);
  };

  const handleApprove = async (submission: any) => {
    const updatedSubmissions = submissions.map(sub => 
      sub.id === submission.id 
        ? { ...sub, status: 'approved' as const, approvedAt: new Date().toISOString() }
        : sub
    );
    
    setSubmissions(updatedSubmissions);
    setRefreshKey(prev => prev + 1);
    
    toast({
      title: "Submission Approved",
      description: `${submission.studentName}'s submission has been approved`,
    });
  };

  const playAudioFeedback = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
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
                  {submissions.filter(s => s.status === 'pending').length}
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
                  {submissions.filter(s => s.status === 'reviewed').length}
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
                  {submissions.filter(s => s.status === 'approved').length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or lesson..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <Card className="border-border/50 shadow-card">
              <CardContent className="py-12 text-center">
                <Video className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No submissions match your filters' 
                    : 'No submissions yet'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSubmissions.map((submission) => (
            <Card 
              key={`${submission.id}-${refreshKey}`} 
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
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Your feedback:</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudioFeedback(submission.feedback!)}
                          >
                            <Volume2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-muted-foreground">{submission.feedback}</p>
                        {submission.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "w-3 h-3",
                                  star <= submission.rating! 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-muted-foreground"
                                )}
                              />
                            ))}
                          </div>
                        )}
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
                    {(submission.status === 'reviewed' && submission.feedback) && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleApprove(submission)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Review Submission</DialogTitle>
              <DialogDescription>
                {selectedSubmission?.studentName} - {selectedSubmission?.lessonTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 pt-4">
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

              {/* Rating */}
              <div className="space-y-2">
                <Label className="font-medium">Rating</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={cn(
                          "w-6 h-6 transition-colors",
                          star <= rating 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-muted-foreground hover:text-yellow-400"
                        )}
                      />
                    </Button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {rating} star{rating !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <Label className="font-medium">Your Feedback</Label>
                <Textarea
                  placeholder="Provide constructive feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>

            </div>
            
            {/* Fixed Footer with Buttons */}
            <div className="flex-shrink-0 border-t pt-4 mt-4">
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedSubmission(null);
                    setFeedback('');
                    setRating(0);
                  }}
                  disabled={isReviewing}
                >
                  Cancel
                </Button>
                <Button 
                  variant="gradient" 
                  onClick={handleReview}
                  disabled={isReviewing}
                >
                  {isReviewing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
