import { cn } from '@/lib/utils';
import { Signal, SignalHigh, SignalLow, SignalZero } from 'lucide-react';

interface DetectionQualityIndicatorProps {
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  tip: string;
  handVisible: boolean;
  handCount: number;
}

export function DetectionQualityIndicator({ quality, tip, handVisible, handCount }: DetectionQualityIndicatorProps) {
  const qualityConfig = {
    poor: { color: 'text-destructive', bg: 'bg-destructive/10', icon: SignalZero, label: 'Poor' },
    fair: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: SignalLow, label: 'Fair' },
    good: { color: 'text-primary', bg: 'bg-primary/10', icon: Signal, label: 'Good' },
    excellent: { color: 'text-green-500', bg: 'bg-green-500/10', icon: SignalHigh, label: 'Excellent' },
  };

  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm', config.bg)}>
      <Icon className={cn('w-4 h-4', config.color)} />
      <span className={cn('font-medium', config.color)}>{config.label}</span>
      <span className="text-muted-foreground text-xs hidden sm:inline">• {tip}</span>
      {handCount > 1 && (
        <span className="text-xs text-muted-foreground">({handCount} hands)</span>
      )}
    </div>
  );
}
