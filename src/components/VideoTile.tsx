import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Mic, 
  MicOff, 
  VideoOff, 
  Crown 
} from 'lucide-react';

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
  connectionState?: RTCPeerConnectionState;
  className?: string;
}

export function VideoTile({
  stream,
  name,
  isHost = false,
  isMuted = false,
  isVideoOff = false,
  isLocal = false,
  isScreenShare = false,
  connectionState,
  className,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Setting video stream for:', name, stream);
      videoRef.current.srcObject = stream;
      
      // Ensure video plays
      videoRef.current.play().catch(error => {
        console.warn('Video play failed:', error);
      });
    }
  }, [stream, name]);

  return (
    <Card className={cn(
      "border-border/50 shadow-card overflow-hidden",
      isHost && "ring-2 ring-primary",
      className
    )}>
      <CardContent className="p-0 relative">
        <div className="aspect-video bg-foreground/5">
          {stream && !isVideoOff ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className={cn(
                "w-full h-full object-cover",
                isLocal && !isScreenShare && "transform scale-x-[-1]"
              )}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                <span className="text-3xl font-bold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              {isVideoOff && (
                <p className="text-sm text-muted-foreground">Camera off</p>
              )}
              {!stream && !isLocal && (
                <p className="text-xs text-muted-foreground">
                  {connectionState === 'connecting' ? 'Connecting...' :
                   connectionState === 'failed' ? 'Connection failed' :
                   connectionState === 'disconnected' ? 'Disconnected' :
                   'Video not available yet'}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Name & Status Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium truncate">
                {name} {isLocal && '(You)'}
              </span>
              {isHost && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Host
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isMuted && (
                <div className="w-6 h-6 rounded-full bg-destructive/80 flex items-center justify-center">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
              {isVideoOff && (
                <div className="w-6 h-6 rounded-full bg-muted-foreground/80 flex items-center justify-center">
                  <VideoOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
