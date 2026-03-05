import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { collapsed, toggleCollapsed } = useSidebar();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Mobile header with hamburger */}
      <header className={cn(
        "fixed top-0 right-0 z-30 h-14 flex items-center px-4 bg-background/80 backdrop-blur-lg border-b border-border/50 lg:hidden",
        "left-20"
      )}>
        <button
          onClick={toggleCollapsed}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      </header>
      
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "pl-20",
        !collapsed && "lg:pl-64"
      )}>
        <div className="p-6 pt-20 lg:pt-8 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
