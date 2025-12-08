import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'success';
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  variant = 'default',
  className 
}: StatsCardProps) {
  const variants = {
    default: {
      card: 'bg-card',
      icon: 'bg-muted text-muted-foreground',
    },
    primary: {
      card: 'bg-gradient-primary text-primary-foreground',
      icon: 'bg-primary-foreground/20 text-primary-foreground',
    },
    secondary: {
      card: 'bg-gradient-secondary',
      icon: 'bg-secondary-foreground/20 text-secondary-foreground',
    },
    success: {
      card: 'bg-success text-success-foreground',
      icon: 'bg-success-foreground/20 text-success-foreground',
    },
  };

  const styles = variants[variant];

  return (
    <Card className={cn(
      "border-border/50 shadow-card hover:shadow-lg transition-all duration-300 overflow-hidden",
      styles.card,
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-sm font-medium",
              variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
            )}>
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight">
              {value}
            </p>
            {(description || trend) && (
              <div className="flex items-center gap-2 text-sm">
                {trend && (
                  <span className={cn(
                    "font-medium",
                    trend.positive ? 'text-success' : 'text-destructive'
                  )}>
                    {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                  </span>
                )}
                {description && (
                  <span className={variant === 'default' ? 'text-muted-foreground' : 'opacity-70'}>
                    {description}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            styles.icon
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
