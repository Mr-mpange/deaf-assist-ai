import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Mic, 
  MicOff, 
  VideoOff, 
  Crown,
  RefreshCw,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  onRetryCamera?: () => void;
  onClick?: () => void;
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
  onRetryCamera,
  onClick,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [cameraSetupTimeout, setCameraSetupTimeout] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('Setting video stream for:', name, stream);
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Set video properties for better compatibility
      video.muted = isLocal; // Local video should be muted to prevent feedback
      video.playsInline = true;
      video.autoplay = true;
      
      // Reset loading states
      setIsVideoLoading(true);
      setIsVideoPlaying(false);
      
      // Add event listeners
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded for:', name);
        setIsVideoLoading(false);
      };
      
      video.oncanplay = () => {
        console.log('Video can play for:', name);
        setIsVideoLoading(false);
      };
      
      video.onplay = () => {
        console.log('Video started playing for:', name);
        setIsVideoPlaying(true);
        setIsVideoLoading(false);
      };
      
      video.onpause = () => {
        setIsVideoPlaying(false);
      };
      
      video.onerror = (e) => {
        console.error('Video error for', name, ':', e);
        setIsVideoLoading(false);
        setIsVideoPlaying(false);
      };
      
      // Ensure video plays with multiple attempts
      const playVideo = async () => {
        try {
          await video.play();
          console.log('Video playing successfully for:', name);
        } catch (error) {
          console.warn('Video play failed for', name, ':', error);
          setIsVideoLoading(false);
          
          // Try again after a short delay
          setTimeout(async () => {
            try {
              await video.play();
              console.log('Video playing on retry for:', name);
            } catch (retryError) {
              console.error('Video play retry failed for', name, ':', retryError);
              setIsVideoLoading(false);
            }
          }, 100);
        }
      };
      
      playVideo();
    } else {
      // No stream, reset states
      setIsVideoLoading(false);
      setIsVideoPlaying(false);
      
      // If this is a local user and no stream after 10 seconds, show timeout
      if (isLocal) {
        const timeout = setTimeout(() => {
          setCameraSetupTimeout(true);
        }, 10000); // 10 seconds timeout
        
        return () => clearTimeout(timeout);
      }
    }
  }, [stream, name, isLocal]);

  // Reset timeout when stream becomes available
  useEffect(() => {
    if (stream) {
      setCameraSetupTimeout(false);
    }
  }, [stream]);

  return (
    <Card className={cn(
      "border-border/50 shadow-card overflow-hidden transition-all duration-200",
      isHost && "ring-2 ring-primary",
      onClick && "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg",
      className
    )}>
      <CardContent className="p-0 relative" onClick={onClick}>
        <div className="aspect-video bg-foreground/5 relative">
          {stream && !isVideoOff ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                controls={false}
                disablePictureInPicture
                className={cn(
                  "w-full h-full object-cover",
                  isLocal && !isScreenShare && "transform scale-x-[-1]"
                )}
                style={{ backgroundColor: '#000' }}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded for:', name);
                }}
                onCanPlay={() => {
                  console.log('Video can play for:', name);
                }}
                onPlay={() => {
                  console.log('Video started playing for:', name);
                }}
                onError={(e) => {
                  console.error('Video error for', name, ':', e);
                }}
              />
              
              {/* Loading indicator - only show when actually loading */}
              {isVideoLoading && !isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin opacity-75" />
                </div>
              )}
            </>
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
              {!stream && isLocal && (
                <div className="text-center">
                  {cameraSetupTimeout ? (
                    <div>
                      <p className="text-xs text-red-600 mb-2">Camera setup failed</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Check camera permissions or try refreshing
                      </p>
                      {onRetryCamera && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRetryCamera}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry Camera
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Setting up camera...
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!stream && !isLocal && (
                <p className="text-xs text-muted-foreground">
                  {connectionState === 'connecting' ? 'Connecting...' :
                   connectionState === 'failed' ? 'Connection failed' :
                   connectionState === 'disconnected' ? 'Disconnected' :
                   'Waiting for video...'}
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
