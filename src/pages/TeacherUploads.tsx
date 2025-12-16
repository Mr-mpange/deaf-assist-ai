import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Upload, 
  Plus, 
  Video, 
  Eye, 
  Edit2, 
  Trash2,
  Clock,
  FileVideo,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';
import { RecordingDiagnostic } from '@/components/RecordingDiagnostic';
import { Navigate } from 'react-router-dom';

export default function TeacherUploads() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [deletingLesson, setDeletingLesson] = useState<any>(null);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const [lessons, setLessons] = useState<Tables<'lessons'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Role protection is handled by the route, but double-check here
  if (role !== 'teacher' && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Load lessons from database
  useEffect(() => {
    const loadLessons = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading lessons:', error);
          toast({
            title: "Error Loading Lessons",
            description: "Failed to load your lessons. Please try again.",
            variant: "destructive",
          });
        } else {
          setLessons(data || []);
        }
      } catch (error) {
        console.error('Error loading lessons:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, [user?.id, toast]);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      toast({
        title: "Video Selected",
        description: `Selected: ${file.name}`,
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid video file",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const uploadVideoToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      // Try to upload to lesson-videos bucket
      let { data, error } = await supabase.storage
        .from('lesson-videos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      // If bucket doesn't exist, try session-recordings as fallback
      if (error && error.message.includes('bucket')) {
        console.log('lesson-videos bucket not found, using session-recordings as fallback');
        const fallbackFileName = `lessons/${fileName}`;
        const result = await supabase.storage
          .from('session-recordings')
          .upload(fallbackFileName, file, {
            contentType: file.type,
            upsert: false
          });
        
        data = result.data;
        error = result.error;
        
        if (!error && data) {
          // Get public URL from session-recordings bucket
          const { data: urlData } = supabase.storage
            .from('session-recordings')
            .getPublicUrl(fallbackFileName);
          return urlData.publicUrl;
        }
      }

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // Get public URL from lesson-videos bucket
      const { data: urlData } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleUpload = async () => {
    if (!formData.title || !formData.category || !formData.difficulty) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile && !editingLesson) {
      toast({
        title: "No Video Selected",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload lessons",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      if (editingLesson) {
        // Update existing lesson
        let videoUrl = editingLesson.video_url;
        
        // Upload new video if selected
        if (selectedFile) {
          const uploadedUrl = await uploadVideoToStorage(selectedFile);
          if (!uploadedUrl) {
            throw new Error('Failed to upload video');
          }
          videoUrl = uploadedUrl;
        }

        const { data, error } = await supabase
          .from('lessons')
          .update({
            title: formData.title,
            description: formData.description || null,
            category: formData.category,
            difficulty: formData.difficulty,
            video_url: videoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLesson.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setLessons(lessons.map(lesson => 
          lesson.id === editingLesson.id ? data : lesson
        ));
        
        toast({
          title: "Lesson Updated",
          description: `"${formData.title}" has been updated successfully!`,
        });
      } else {
        // Create new lesson
        let videoUrl: string | null = null;
        
        if (selectedFile) {
          videoUrl = await uploadVideoToStorage(selectedFile);
          if (!videoUrl) {
            throw new Error('Failed to upload video');
          }
        }

        const { data, error } = await supabase
          .from('lessons')
          .insert({
            title: formData.title,
            description: formData.description || null,
            category: formData.category,
            difficulty: formData.difficulty,
            author_id: user.id,
            video_url: videoUrl,
            duration: Math.floor(Math.random() * 30) + 5, // Placeholder duration
            views: 0,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setLessons([data, ...lessons]);
        
        toast({
          title: "Lesson Uploaded",
          description: `"${formData.title}" has been published successfully!${selectedFile ? ` Video: ${selectedFile.name}` : ''}`,
        });
      }
      
      setFormData({ title: '', description: '', category: '', difficulty: '' });
      setEditingLesson(null);
      setSelectedFile(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to save lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (lesson: Tables<'lessons'>) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      category: lesson.category,
      difficulty: lesson.difficulty,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (lesson: Tables<'lessons'>) => {
    try {
      // Delete video from storage if it exists
      if (lesson.video_url) {
        const urlParts = lesson.video_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
          // Try lesson-videos bucket first
          let { error } = await supabase.storage
            .from('lesson-videos')
            .remove([`${lesson.author_id}/${fileName}`]);
          
          // If not found, try session-recordings bucket
          if (error) {
            await supabase.storage
              .from('session-recordings')
              .remove([`lessons/${lesson.author_id}/${fileName}`]);
          }
        }
      }

      // Delete lesson from database
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lesson.id);

      if (error) throw error;

      // Update local state
      const updatedLessons = lessons.filter(l => l.id !== lesson.id);
      setLessons(updatedLessons);
      
      toast({
        title: "Lesson Deleted",
        description: `"${lesson.title}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingLesson(null);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', category: '', difficulty: '' });
    setEditingLesson(null);
    setSelectedFile(null);
    setIsDragOver(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Upload className="w-8 h-8 text-primary" />
              My Uploads
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your uploaded lessons and videos
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="w-4 h-4 mr-2" />
                Upload New Lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingLesson ? 'Edit Lesson' : 'Upload New Lesson'}
                </DialogTitle>
                <DialogDescription>
                  {editingLesson ? 'Update your lesson details' : 'Create a new lesson for your students'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Video Upload Area */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : selectedFile 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                        : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => document.getElementById('video-upload')?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FileVideo className={`w-12 h-12 mx-auto mb-4 ${
                    selectedFile ? 'text-green-500' : 'text-muted-foreground/50'
                  }`} />
                  {selectedFile ? (
                    <>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Click to select a different file
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Drop video file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </>
                  )}
                  <Input 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    id="video-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Lesson Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Greetings"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what students will learn..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basics">Basics</SelectItem>
                        <SelectItem value="Vocabulary">Vocabulary</SelectItem>
                        <SelectItem value="Conversation">Conversation</SelectItem>
                        <SelectItem value="Grammar">Grammar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Difficulty *</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1" 
                    variant="gradient"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingLesson ? 'Updating...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        {editingLesson ? (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Update Lesson
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Publish Lesson
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lessons Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 shadow-card overflow-hidden">
                <div className="aspect-video bg-muted animate-pulse" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-muted animate-pulse rounded w-16" />
                    <div className="h-3 bg-muted animate-pulse rounded w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lessons.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className="border-border/50 shadow-card overflow-hidden group">
                <div className="relative aspect-video">
                  <img
                    src={lesson.thumbnail_url || '/placeholder.svg'}
                    alt={lesson.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="icon" 
                      variant="secondary"
                      onClick={() => setPreviewLesson(lesson)}
                      title="Preview video"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary"
                      onClick={() => handleEdit(lesson)}
                      title="Edit lesson"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="destructive"
                      onClick={() => setDeletingLesson(lesson)}
                      title="Delete lesson"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground">{lesson.category}</p>
                      {lesson.updated_at && lesson.updated_at !== lesson.created_at && (
                        <p className="text-xs text-muted-foreground/70">
                          Updated {new Date(lesson.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {lesson.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {lesson.views}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {lesson.duration}m
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50 shadow-card">
            <CardContent className="py-16 text-center">
              <Video className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No lessons yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first lesson to start teaching
              </p>
              <Button variant="gradient" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload First Lesson
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingLesson} onOpenChange={() => setDeletingLesson(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingLesson?.title}"? This action cannot be undone.
                All student progress and submissions for this lesson will also be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(deletingLesson)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Lesson
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Video Diagnostics */}
        <RecordingDiagnostic />

        {/* Video Preview Dialog */}
        <Dialog open={!!previewLesson} onOpenChange={() => setPreviewLesson(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewLesson?.title}</DialogTitle>
              <DialogDescription>
                {previewLesson?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-video">
              {previewLesson?.video_url ? (
                <EnhancedVideoPlayer
                  src={previewLesson.video_url}
                  title={previewLesson.title}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
                  <div className="text-center text-white/50">
                    <Video className="w-12 h-12 mx-auto mb-2" />
                    <p>No video available</p>
                    <p className="text-sm mt-1">Video may not have been uploaded properly</p>
                  </div>
                </div>
              )}
            </div>
            
            {previewLesson && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="outline">{previewLesson.category}</Badge>
                <Badge variant="outline">{previewLesson.difficulty}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {previewLesson.duration} min
                </span>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
