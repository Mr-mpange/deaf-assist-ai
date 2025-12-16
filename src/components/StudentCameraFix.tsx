import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentCameraFixProps {
  isStudent: boolean;
  hasStream: boolean;
  onRetryCamera: () => void;
}

export function StudentCameraFix({ isStudent, hasStream, onRetryCamera }: StudentCameraFixProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Auto-retry camera for students if it fails initially
    if (isStudent && !hasStream) {
      const retryTimer = setTimeout(() => {
        console.log('🔄 Auto-retrying camera for student...');
        onRetryCamera();
      }, 2000); // Retry after 2 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [isStudent, hasStream, onRetryCamera]);

  // Only show for students who don't have a stream
  if (!isStudent || hasStream) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="w-4 h-4" />
          Camera Setup Issue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-yellow-700">
          Your camera isn't working in this live session. This might be because:
        </p>
        
        <ul className="text-xs text-yellow-600 space-y-1 ml-4">
          <li>• Camera permission was denied</li>
          <li>• Another app is using your camera</li>
          <li>• Browser doesn't have camera access</li>
          <li>• Camera hardware issue</li>
        </ul>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onRetryCamera}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Camera
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              toast({
                title: "Camera Help",
                description: "1. Allow camera permission in browser\n2. Close other video apps\n3. Refresh the page\n4. Try Chrome browser",
              });
            }}
          >
            Help
          </Button>
        </div>

        <div className="text-xs text-yellow-600">
          <p><strong>Quick fixes:</strong></p>
          <p>1. Click "Allow" when browser asks for camera</p>
          <p>2. Close Zoom, Teams, or other video apps</p>
          <p>3. Refresh this page and try again</p>
          <p>4. Use Chrome browser for best compatibility</p>
        </div>
      </CardContent>
    </Card>
  );
}