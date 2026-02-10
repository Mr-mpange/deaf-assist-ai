import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import {
  Home,
  BookOpen,
  Video,
  Users,
  BarChart3,
  LogOut,
  Upload,
  Camera,
  Radio,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Trophy,
  User,
  Sun,
  Moon,
  LineChart,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: ('student' | 'teacher' | 'admin')[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, href: '/dashboard', roles: ['student', 'teacher', 'admin'] },
  { label: 'My Profile', icon: User, href: '/profile', roles: ['student', 'teacher', 'admin'] },
  { label: 'Lessons', icon: BookOpen, href: '/lessons', roles: ['student', 'teacher', 'admin'] },
  { label: 'Practice', icon: Camera, href: '/practice', roles: ['student', 'teacher', 'admin'] },
  { label: 'Live Sessions', icon: Radio, href: '/live', roles: ['student', 'teacher', 'admin'] },
  { label: 'Leaderboard', icon: Trophy, href: '/leaderboard', roles: ['student', 'teacher', 'admin'] },
  { label: 'Progress', icon: LineChart, href: '/progress', roles: ['student', 'teacher', 'admin'] },
  { label: 'My Uploads', icon: Upload, href: '/uploads', roles: ['teacher', 'admin'] },
  { label: 'Submissions', icon: Video, href: '/submissions', roles: ['teacher', 'admin'] },
  { label: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics', roles: ['admin'] },
];

export function Sidebar() {
  const { user, profile, role, logout } = useAuth();
  const location = useLocation();
  const { collapsed, toggleCollapsed } = useSidebar();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  const userRole = role || 'student';
  const userName = profile?.name || user.email?.split('@')[0] || 'User';

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  const getRoleColor = () => {
    switch (userRole) {
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'teacher': return 'bg-secondary/20 text-secondary-foreground';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Teacher';
      default: return 'Student';
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleCollapsed}
        />
      )}
      
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <GraduationCap className="w-6 h-6 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-lg text-sidebar-foreground">DeafLearn</h1>
            <p className="text-xs text-muted-foreground">Sign Language Hub</p>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className={cn(
        "px-4 py-4 border-b border-sidebar-border",
        collapsed ? "flex justify-center" : ""
      )}>
        <div className={cn(
          "flex items-center gap-3",
          collapsed ? "flex-col" : ""
        )}>
          <div className="w-10 h-10 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="font-medium text-sidebar-foreground truncate">{userName}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", getRoleColor())}>
                {getRoleLabel()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform",
                isActive ? "text-sidebar-primary" : "",
                "group-hover:scale-110"
              )} />
              {!collapsed && (
                <span className="animate-fade-in">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed ? "justify-center px-0" : ""
          )}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="ml-3">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed ? "justify-center px-0" : ""
          )}
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </aside>
    </>
  );
}