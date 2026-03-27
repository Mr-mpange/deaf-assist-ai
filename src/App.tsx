import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import LessonDetail from "./pages/LessonDetail";
import Practice from "./pages/Practice";
import LiveSessions from "./pages/LiveSessions";
import TeacherUploads from "./pages/TeacherUploads";
import TeacherSubmissions from "./pages/TeacherSubmissions";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import NotFound from "./pages/NotFound";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import ProgressDashboard from "./pages/ProgressDashboard";
import Dictionary from "./pages/Dictionary";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Role-based Protected Route wrapper
function RoleProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: ('admin' | 'teacher' | 'student')[];
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check role access
  const userRole = role || 'student';
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Public Route wrapper (redirects to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      {/* Protected Routes - All authenticated users */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/lessons" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
      <Route path="/lessons/:id" element={<ProtectedRoute><LessonDetail /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute><LiveSessions /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
      <Route path="/dictionary" element={<ProtectedRoute><Dictionary /></ProtectedRoute>} />
      
      {/* Teacher Routes */}
      <Route path="/uploads" element={
        <RoleProtectedRoute allowedRoles={['teacher', 'admin']}>
          <TeacherUploads />
        </RoleProtectedRoute>
      } />
      <Route path="/submissions" element={
        <RoleProtectedRoute allowedRoles={['teacher', 'admin']}>
          <TeacherSubmissions />
        </RoleProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/users" element={
        <RoleProtectedRoute allowedRoles={['admin']}>
          <AdminUsers />
        </RoleProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <RoleProtectedRoute allowedRoles={['admin']}>
          <AdminAnalytics />
        </RoleProtectedRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="deaflearn-theme">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;