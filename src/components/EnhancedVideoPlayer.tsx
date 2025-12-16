import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Download, AlertTriangle, RefreshCw } from 'lucide-react';

interface EnhancedVideoPlayerProps {
  src: string;
  title: string;
  className?: string;
}

export function EnhancedVideoPlayer({ src, title, className }: EnhancedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      console.log('🎥 Video loading started:', src);
      setIsLoading(true);
      setHasError(false);
    };

    const handleLoadedMetadata = () => {
      console.log('📊 Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        src: video.src
      });
      setVideoInfo({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };

    const handleCanPlay = () => {
      console.log('✅ Video can play');
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      console.error('❌ Video error:', e);
      const error = video.error;
      let message = 'Unknown video error';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Video playback was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'Network error occurred while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Video format not supported or corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Video format not supported by browser';
            break;
        }
      }
      
      console.error('Video error details:', {
        code: error?.code,
        message: error?.message,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src
      });
      
      setHasError(true);
      setErrorMessage(message);
      setIsLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(error => {
        console.error('Play failed:', error);
        setHasError(true);
        setErrorMessage('Failed to play video. Try downloading instead.');
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const retry = () => {
    const video = videoRef.current;
    if (!video) return;
    
    setHasError(false);
    setIsLoading(true);
    video.load();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        preload="metadata"
        playsInline
      />

      {/* Loading overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white p-6 max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2">Video Playback Error</h3>
            <p className="text-sm text-gray-300 mb-4">{errorMessage}</p>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={retry} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={src} download={`${title}.webm`}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>

            <div className="mt-4 text-xs text-gray-400">
              <p>Common fixes:</p>
              <p>• Try a different browser (Chrome works best)</p>
              <p>• Download and play in VLC media player</p>
              <p>• Check if video file is corrupted</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              {videoInfo && (
                <div className="text-white text-sm">
                  <Badge variant="secondary" className="text-xs">
                    {formatDuration(videoInfo.duration)} • {videoInfo.width}x{videoInfo.height}
                  </Badge>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/20"
            >
              <a href={src} download={`${title}.webm`}>
                <Download className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}