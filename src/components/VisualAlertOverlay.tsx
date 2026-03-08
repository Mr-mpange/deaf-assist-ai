import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VisualAlert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  timestamp: number;
}

interface VisualAlertOverlayProps {
  sessionId: string;
}

export function VisualAlertOverlay({ sessionId }: VisualAlertOverlayProps) {
  const [alerts, setAlerts] = useState<VisualAlert[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showAlert = useCallback((message: string, type: VisualAlert['type'] = 'info') => {
    const id = `alert-${Date.now()}`;
    setAlerts(prev => [...prev.slice(-4), { id, message, type, timestamp: Date.now() }]);

    // Flash screen border
    const colors: Record<string, string> = {
      info: 'ring-primary',
      warning: 'ring-yellow-500',
      success: 'ring-green-500',
      urgent: 'ring-destructive',
    };
    setFlashColor(colors[type] || 'ring-primary');

    // Try vibration API
    if ('vibrate' in navigator) {
      const patterns: Record<string, number[]> = {
        info: [100],
        warning: [100, 50, 100],
        success: [200],
        urgent: [100, 50, 100, 50, 100],
      };
      navigator.vibrate(patterns[type] || [100]);
    }

    // Clear flash after animation
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlashColor(null), 1500);

    // Auto-remove alert after 5s
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  }, []);

  // Expose showAlert globally for other components to trigger
  useEffect(() => {
    (window as any).__visualAlert = showAlert;
    return () => {
      delete (window as any).__visualAlert;
    };
  }, [showAlert]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* Screen flash border */}
      {flashColor && (
        <div 
          className={cn(
            "fixed inset-0 pointer-events-none z-[100] ring-4 ring-inset rounded-none animate-pulse",
            flashColor
          )}
          style={{ animationDuration: '0.5s' }}
        />
      )}

      {/* Alert toasts - visual only, no sound */}
      {alerts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[101] flex flex-col gap-2 pointer-events-none">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-top-2 duration-300 min-w-[280px] text-center",
                alert.type === 'info' && 'bg-primary/90 text-primary-foreground border-primary',
                alert.type === 'warning' && 'bg-yellow-500/90 text-white border-yellow-600',
                alert.type === 'success' && 'bg-green-500/90 text-white border-green-600',
                alert.type === 'urgent' && 'bg-destructive/90 text-destructive-foreground border-destructive',
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  alert.type === 'urgent' ? 'bg-white' : 'bg-white/80'
                )} />
                {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Helper to trigger visual alerts from anywhere
export function triggerVisualAlert(message: string, type: 'info' | 'warning' | 'success' | 'urgent' = 'info') {
  const showAlert = (window as any).__visualAlert;
  if (showAlert) {
    showAlert(message, type);
  }
}