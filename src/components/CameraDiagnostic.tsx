import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Mic, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export function CameraDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string) => {
    setResults(prev => [...prev, { test, status, message }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addResult('Media Devices API', 'error', 'getUserMedia not supported in this browser');
    } else {
      addResult('Media Devices API', 'success', 'getUserMedia is available');
    }

    // Test 2: Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      addResult('Secure Context', 'error', 'HTTPS required for camera access (except localhost)');
    } else {
      addResult('Secure Context', 'success', 'Running in secure context');
    }

    // Test 3: Check permissions
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        addResult('Camera Permission', 
          cameraPermission.state === 'granted' ? 'success' : 
          cameraPermission.state === 'denied' ? 'error' : 'warning',
          `Camera permission: ${cameraPermission.state}`
        );
        
        addResult('Microphone Permission', 
          micPermission.state === 'granted' ? 'success' : 
          micPermission.state === 'denied' ? 'error' : 'warning',
          `Microphone permission: ${micPermission.state}`
        );
      } else {
        addResult('Permissions API', 'warning', 'Permissions API not available');
      }
    } catch (error) {
      addResult('Permission Check', 'warning', 'Could not check permissions');
    }

    // Test 4: Try to enumerate devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      addResult('Video Devices', 
        videoDevices.length > 0 ? 'success' : 'error',
        `Found ${videoDevices.length} camera(s)`
      );
      
      addResult('Audio Devices', 
        audioDevices.length > 0 ? 'success' : 'error',
        `Found ${audioDevices.length} microphone(s)`
      );
    } catch (error) {
      addResult('Device Enumeration', 'error', `Failed to enumerate devices: ${error}`);
    }

    // Test 5: Try to get camera stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      
      addResult('Camera Access', 'success', 'Successfully accessed camera and microphone');
      
      // Test video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        addResult('Video Track', 'success', `Video: ${videoTrack.label} (${videoTrack.readyState})`);
      }
      
      // Test audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        addResult('Audio Track', 'success', `Audio: ${audioTrack.label} (${audioTrack.readyState})`);
      }
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error: any) {
      addResult('Camera Access', 'error', `Failed to access camera: ${error.name} - ${error.message}`);
    }

    // Test 6: Check WebRTC support
    if (window.RTCPeerConnection) {
      addResult('WebRTC Support', 'success', 'RTCPeerConnection is available');
    } else {
      addResult('WebRTC Support', 'error', 'RTCPeerConnection not supported');
    }

    // Test 7: Check Speech Synthesis
    if ('speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      addResult('Text-to-Speech', 'success', `Speech synthesis available with ${voices.length} voices`);
    } else {
      addResult('Text-to-Speech', 'error', 'Speech synthesis not supported');
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Camera & Audio Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-3 p-2 border rounded">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.test}</span>
                    <Badge variant={
                      result.status === 'success' ? 'default' : 
                      result.status === 'error' ? 'destructive' : 'secondary'
                    }>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Common Issues:</strong></p>
          <p>• Camera permission denied - Allow camera access in browser settings</p>
          <p>• Camera in use by another app - Close other video apps</p>
          <p>• Not HTTPS - Camera requires secure connection (except localhost)</p>
          <p>• No camera detected - Check if camera is connected and working</p>
        </div>
      </CardContent>
    </Card>
  );
}