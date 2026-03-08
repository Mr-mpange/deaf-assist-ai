import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Crown, Mic, MicOff, VideoOff, Loader2, PictureInPicture2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
  const [forceRefresh, setForceRefresh] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);

  // Force refresh mechanism - trigger Force Fix approach if video doesn't work
  useEffect(() => {
    if (isOpen && stream && !isVideoOff) {
      const refreshTimer = setTimeout(() => {
        console.log('🔄 Auto-triggering Force Fix approach (backup)...');
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = null;
          video.load();
          setTimeout(() => {
            video.srcObject = stream;
            video.play().catch(console.error);
          }, 200);
        }
        setForceRefresh(prev => prev + 1);
      }, 500); // Trigger much earlier - after 500ms

      return () => clearTimeout(refreshTimer);
    }
  }, [isOpen, stream, isVideoOff]);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 Fullscreen modal opened with:', {
        name,
        hasStream: !!stream,
        streamId: stream?.id,
        videoTracks: stream?.getVideoTracks().length || 0,
        audioTracks: stream?.getAudioTracks().length || 0,
        isVideoOff,
        isLocal,
        isScreenShare
      });
      
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          console.log('📹 Video track details:', {
            enabled: videoTrack.enabled,
            readyState: videoTrack.readyState,
            settings: videoTrack.getSettings()
          });
        }
      }
    }
  }, [isOpen, stream, name, isVideoOff, isLocal, isScreenShare]);

  // Auto-click the Force Fix approach when modal opens
  useEffect(() => {
    if (isOpen && stream && videoRef.current) {
      // Wait for modal to be fully rendered, then auto-trigger Force Fix
      const autoFixTimer = setTimeout(() => {
        console.log('🔄 Auto-clicking Force Fix approach...');
        // Simulate the exact same logic as the Force Fix button
        const video = videoRef.current;
        if (video && stream) {
          video.srcObject = null;
          video.load();
          setTimeout(() => {
            video.srcObject = stream;
            video.play().catch(console.error);
          }, 200);
        }
      }, 300); // Wait a bit longer for modal to be ready

      return () => clearTimeout(autoFixTimer);
    }
  }, [isOpen, stream]);

  useEffect(() => {
    if (videoRef.current && stream && isOpen) {
      console.log('🎬 Setting fullscreen video stream:', stream);
      const video = videoRef.current;
      
      // Set video properties for better compatibility
      video.muted = isLocal; // Local video should be muted to prevent feedback
      video.playsInline = true;
      video.autoplay = true;
      
      console.log('🎬 Stream set on video element:', {
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoElement: video,
        videoSrc: video.srcObject
      });
      
      // Check video track details
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('📹 Video track in fullscreen:', {
          id: videoTrack.id,
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          settings: videoTrack.getSettings(),
          constraints: videoTrack.getConstraints()
        });
        
        // Force video track to be enabled
        videoTrack.enabled = true;
      }
      
      // Add event listeners for better debugging
      video.onloadedmetadata = () => {
        console.log('✅ Fullscreen video metadata loaded');
        console.log('📐 Video dimensions:', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          clientWidth: video.clientWidth,
          clientHeight: video.clientHeight,
          offsetWidth: video.offsetWidth,
          offsetHeight: video.offsetHeight
        });
        setIsVideoLoading(false);
        setHasVideoError(false);
      };
      
      video.oncanplay = () => {
        console.log('✅ Fullscreen video can play');
        setIsVideoLoading(false);
        setHasVideoError(false);
      };
      
      video.onplay = () => {
        console.log('✅ Fullscreen video started playing');
        setIsVideoLoading(false);
        setHasVideoError(false);
      };
      
      video.onerror = (e) => {
        console.error('❌ Fullscreen video error:', e);
        setIsVideoLoading(false);
        setHasVideoError(true);
      };
      
      video.onloadstart = () => {
        console.log('🔄 Fullscreen video load started');
        setIsVideoLoading(true);
        setHasVideoError(false);
      };
      
      video.onwaiting = () => {
        console.log('⏳ Fullscreen video waiting for data');
      };
      
      video.onstalled = () => {
        console.log('⚠️ Fullscreen video stalled');
      };
      
    } else if (videoRef.current && !stream) {
      // Clear video when no stream
      videoRef.current.srcObject = null;
    }
  }, [stream, isOpen, isLocal]);

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
        <VisuallyHidden>
          <DialogTitle>
            {isScreenShare ? 'Screen Share' : `${name}${isLocal ? ' (You)' : ''}`}
          </DialogTitle>
          <DialogDescription>
            Fullscreen video view. Press ESC or click to close.
          </DialogDescription>
        </VisuallyHidden>
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

          {/* Picture-in-Picture button */}
          {stream && !isVideoOff && document.pictureInPictureEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (document.pictureInPictureElement === videoRef.current) {
                    document.exitPictureInPicture().catch(console.error);
                  } else {
                    videoRef.current.requestPictureInPicture().catch(console.error);
                  }
                }
              }}
              className="absolute top-4 right-16 z-50 bg-black/50 hover:bg-black/70 text-white"
              title="Picture-in-Picture"
            >
              <PictureInPicture2 className="w-6 h-6" />
            </Button>
          )}
          {/* Debug refresh button (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-4 right-32 z-50 space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('🔄 Manual refresh triggered');
                  setForceRefresh(prev => prev + 1);
                }}
                className="bg-black/50 hover:bg-black/70 text-white text-xs"
              >
                Refresh Video
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('🔄 Force recreate video element');
                  if (videoRef.current && stream) {
                    const video = videoRef.current;
                    video.srcObject = null;
                    video.load();
                    setTimeout(() => {
                      video.srcObject = stream;
                      video.play().catch(console.error);
                    }, 200);
                  }
                }}
                className="bg-black/50 hover:bg-black/70 text-white text-xs"
              >
                Force Fix
              </Button>
            </div>
          )}

          {/* Video content */}
          {stream && !isVideoOff ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <video
                key={`fullscreen-${stream.id}-${forceRefresh}`}
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                controls={false}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full"
                style={{ 
                  backgroundColor: '#000',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onLoadedMetadata={() => {
                  console.log('📹 Fullscreen video metadata loaded');
                }}
                onCanPlay={() => {
                  console.log('📹 Fullscreen video can play');
                }}
                onPlay={() => {
                  console.log('📹 Fullscreen video started playing');
                }}
                onError={(e) => {
                  console.error('📹 Fullscreen video error:', e);
                }}
              />
              
              {/* Loading overlay */}
              {isVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg">Loading video...</p>
                  </div>
                </div>
              )}
              
              {/* Error overlay */}
              {hasVideoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-center text-white">
                    <VideoOff className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-lg mb-4">Video failed to load</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setForceRefresh(prev => prev + 1);
                        setHasVideoError(false);
                        setIsVideoLoading(true);
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-6xl font-bold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              {isVideoOff ? (
                <p className="text-xl text-muted-foreground">Camera is off</p>
              ) : (
                <p className="text-xl text-muted-foreground">No video stream available</p>
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

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && stream && (
            <div className="absolute top-20 left-6">
              <div className="bg-black/70 rounded-lg p-3 text-xs text-white/80">
                <p><strong>Stream Debug:</strong></p>
                <p>ID: {stream.id}</p>
                <p>Video Tracks: {stream.getVideoTracks().length}</p>
                <p>Audio Tracks: {stream.getAudioTracks().length}</p>
                {stream.getVideoTracks()[0] && (
                  <>
                    <p>Video Enabled: {stream.getVideoTracks()[0].enabled ? 'Yes' : 'No'}</p>
                    <p>Video State: {stream.getVideoTracks()[0].readyState}</p>
                  </>
                )}
              </div>
            </div>
          )}

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