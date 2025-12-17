import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
      
      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-4 z-50 transition-all duration-300",
          collapsed ? "left-[72px]" : "left-[248px]",
          "lg:flex hidden" // Show on desktop, hide on mobile
        )}
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </Button>
      
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-4 left-4 z-50 lg:hidden",
          !collapsed && "left-[272px]" // Move button when sidebar is open
        )}
        onClick={toggleCollapsed}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </Button>
      
      <main className={cn(
        "min-h-screen transition-all duration-300",
        // Mobile: always collapsed sidebar (20px padding)
        // Desktop: dynamic padding based on collapsed state
        "pl-20",
        !collapsed && "lg:pl-64"
      )}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
