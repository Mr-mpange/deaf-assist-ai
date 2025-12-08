// Mock data for the Deaf Learning App
// This simulates backend data - ready to be replaced with real API calls

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  authorId: string;
  authorName: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  createdAt: string;
  views: number;
}

export interface LiveSession {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduledAt: string;
  participants: number;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  status: 'pending' | 'reviewed' | 'approved';
  feedback?: string;
  submittedAt: string;
  aiPrediction?: {
    sign: string;
    confidence: number;
  };
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@deaflearn.app',
    password: 'admin123',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@deaflearn.app',
    password: 'teacher123',
    role: 'teacher',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael@deaflearn.app',
    password: 'teacher123',
    role: 'teacher',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily@student.com',
    password: 'student123',
    role: 'student',
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'James Wilson',
    email: 'james@student.com',
    password: 'student123',
    role: 'student',
    createdAt: '2024-03-10T00:00:00Z',
  },
];

// Mock Lessons
export const mockLessons: Lesson[] = [
  {
    id: '1',
    title: 'Introduction to Sign Language',
    description: 'Learn the basics of sign language including finger spelling and common greetings. This lesson covers the fundamental handshapes and movements.',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=225&fit=crop',
    authorId: '2',
    authorName: 'Sarah Johnson',
    category: 'Basics',
    difficulty: 'beginner',
    duration: 15,
    createdAt: '2024-02-15T00:00:00Z',
    views: 1250,
  },
  {
    id: '2',
    title: 'Alphabet & Numbers',
    description: 'Master the sign language alphabet A-Z and numbers 1-100. Essential foundation for spelling words and expressing quantities.',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=225&fit=crop',
    authorId: '2',
    authorName: 'Sarah Johnson',
    category: 'Basics',
    difficulty: 'beginner',
    duration: 20,
    createdAt: '2024-02-20T00:00:00Z',
    views: 980,
  },
  {
    id: '3',
    title: 'Common Phrases for Daily Life',
    description: 'Learn essential phrases for everyday conversations including greetings, asking for help, and expressing emotions.',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop',
    authorId: '3',
    authorName: 'Michael Chen',
    category: 'Conversation',
    difficulty: 'beginner',
    duration: 25,
    createdAt: '2024-03-01T00:00:00Z',
    views: 756,
  },
  {
    id: '4',
    title: 'Family & Relationships',
    description: 'Signs for family members, relationships, and describing people. Learn to talk about your loved ones.',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=225&fit=crop',
    authorId: '2',
    authorName: 'Sarah Johnson',
    category: 'Vocabulary',
    difficulty: 'intermediate',
    duration: 30,
    createdAt: '2024-03-10T00:00:00Z',
    views: 542,
  },
  {
    id: '5',
    title: 'Emotions & Feelings',
    description: 'Express your emotions through sign language. Learn signs for happy, sad, angry, excited, and many more feelings.',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&h=225&fit=crop',
    authorId: '3',
    authorName: 'Michael Chen',
    category: 'Vocabulary',
    difficulty: 'intermediate',
    duration: 22,
    createdAt: '2024-03-15T00:00:00Z',
    views: 428,
  },
  {
    id: '6',
    title: 'Advanced Grammar Structures',
    description: 'Master complex sentence structures, topic-comment order, and non-manual markers for fluent signing.',
    videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=225&fit=crop',
    authorId: '2',
    authorName: 'Sarah Johnson',
    category: 'Grammar',
    difficulty: 'advanced',
    duration: 40,
    createdAt: '2024-03-20T00:00:00Z',
    views: 312,
  },
];

// Mock Live Sessions
export const mockLiveSessions: LiveSession[] = [
  {
    id: '1',
    title: 'Q&A: Sign Language Basics',
    hostId: '2',
    hostName: 'Sarah Johnson',
    status: 'scheduled',
    scheduledAt: '2024-12-10T14:00:00Z',
    participants: 0,
  },
  {
    id: '2',
    title: 'Practice Session: Alphabet',
    hostId: '3',
    hostName: 'Michael Chen',
    status: 'live',
    scheduledAt: '2024-12-08T10:00:00Z',
    participants: 15,
  },
];

// Mock Submissions
export const mockSubmissions: Submission[] = [
  {
    id: '1',
    studentId: '4',
    studentName: 'Emily Davis',
    lessonId: '1',
    lessonTitle: 'Introduction to Sign Language',
    videoUrl: '/uploads/submission1.mp4',
    status: 'pending',
    submittedAt: '2024-12-05T10:30:00Z',
    aiPrediction: {
      sign: 'HELLO',
      confidence: 0.92,
    },
  },
  {
    id: '2',
    studentId: '5',
    studentName: 'James Wilson',
    lessonId: '2',
    lessonTitle: 'Alphabet & Numbers',
    videoUrl: '/uploads/submission2.mp4',
    status: 'reviewed',
    feedback: 'Great job! Your finger spelling is clear. Work on maintaining consistent speed.',
    submittedAt: '2024-12-04T15:45:00Z',
    aiPrediction: {
      sign: 'A-B-C',
      confidence: 0.88,
    },
  },
];

// Mock Analytics
export const mockAnalytics = {
  totalUsers: 156,
  totalLessons: 24,
  totalViews: 15420,
  activeStudents: 89,
  completionRate: 72,
  weeklySignups: [12, 18, 15, 22, 19, 25, 20],
  categoryDistribution: [
    { name: 'Basics', value: 35 },
    { name: 'Vocabulary', value: 28 },
    { name: 'Conversation', value: 22 },
    { name: 'Grammar', value: 15 },
  ],
  recentActivity: [
    { date: '2024-12-01', lessons: 45, practice: 78 },
    { date: '2024-12-02', lessons: 52, practice: 85 },
    { date: '2024-12-03', lessons: 48, practice: 72 },
    { date: '2024-12-04', lessons: 61, practice: 95 },
    { date: '2024-12-05', lessons: 55, practice: 88 },
    { date: '2024-12-06', lessons: 67, practice: 102 },
    { date: '2024-12-07', lessons: 58, practice: 91 },
  ],
};
