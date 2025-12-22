import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface DetectionPerformanceMonitorProps {
  isActive: boolean;
  className?: string;
}

export function DetectionPerformanceMonitor({ isActive, className = "" }: DetectionPerformanceMonitorProps) {
  const [fps, setFps] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  
  useEffect(() => {
    if (!isActive) {
      setFps(0);
      setDetectionCount(0);
      return;
    }

    let frameCount = 0;
    let lastTime = Date.now();
    
    const updateFps = () => {
      frameCount++;
      const currentTime = Date.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        setDetectionCount(prev => prev + frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (isActive) {
        requestAnimationFrame(updateFps);
      }
    };
    
    updateFps();
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      <Badge variant="outline" className="text-xs">
        Detection FPS: {fps}
      </Badge>
      <Badge variant="outline" className="text-xs">
        Total Detections: {detectionCount}
      </Badge>
    </div>
  );
}