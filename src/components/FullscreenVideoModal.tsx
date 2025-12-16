import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Crown, Mic, MicOff, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullscreenVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream?: MediaStream | null;
  name: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
}

export function FullscreenVideoModal({
  isOpen,
  onClose,
  stream,
  name,
  isHost = false,
  isMuted = false,
  isVideoOff = false,
  isLocal = false,
  isScreenShare = false,
}: FullscreenVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && isOpen) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95">
        <div 
          className="relative w-full h-full flex items-center justify-center cursor-pointer" 
          onClick={onClose}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Video content */}
          {stream && !isVideoOff ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                isLocal && !isScreenShare && "transform scale-x-[-1]"
              )}
              style={{ backgroundColor: '#000' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-6xl font-bold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              {isVideoOff && (
                <p className="text-xl text-muted-foreground">Camera is off</p>
              )}
            </div>
          )}

          {/* Overlay info */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white text-2xl font-medium">
                  {name} {isLocal && '(You)'}
                </span>
                {isHost && (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    <Crown className="w-5 h-5 mr-2" />
                    Host
                  </Badge>
                )}
                {isScreenShare && (
                  <Badge variant="default" className="text-lg px-3 py-1">
                    Screen Share
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isMuted && (
                  <div className="w-10 h-10 rounded-full bg-destructive/80 flex items-center justify-center">
                    <MicOff className="w-5 h-5 text-white" />
                  </div>
                )}
                {isVideoOff && (
                  <div className="w-10 h-10 rounded-full bg-muted-foreground/80 flex items-center justify-center">
                    <VideoOff className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute top-6 left-6">
            <div className="bg-black/50 rounded-lg p-3">
              <p className="text-white/90 text-sm font-medium mb-1">Fullscreen View</p>
              <p className="text-white/70 text-xs">
                Press ESC or click X to close • Click anywhere to close
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}