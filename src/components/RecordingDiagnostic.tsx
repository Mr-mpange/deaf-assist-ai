import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Video, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function RecordingDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string) => {
      setDiagnostics(prev => [...prev, { test, status, message }]);
    };

    // Test 1: Check if session_recordings table exists
    try {
      const { data, error } = await supabase
        .from('session_recordings')
        .select('*')
        .limit(5);
      
      if (error) {
        addResult('Recordings Table', 'error', `Table error: ${error.message}`);
      } else {
        addResult('Recordings Table', 'success', `Found ${data?.length || 0} recordings`);
        
        // Check recording URLs
        const recordingsWithUrls = data?.filter(r => r.recording_url) || [];
        const recordingsWithoutUrls = data?.filter(r => !r.recording_url) || [];
        
        if (recordingsWithUrls.length > 0) {
          addResult('Recording URLs', 'success', `${recordingsWithUrls.length} recordings have URLs`);
        }
        
        if (recordingsWithoutUrls.length > 0) {
          addResult('Missing URLs', 'warning', `${recordingsWithoutUrls.length} recordings missing URLs`);
        }
      }
    } catch (error) {
      addResult('Recordings Table', 'error', 'Failed to check recordings table');
    }

    // Test 2: Check storage bucket
    try {
      const { data, error } = await supabase.storage
        .from('session-recordings')
        .list('', { limit: 5 });
      
      if (error) {
        addResult('Storage Bucket', 'error', `Storage error: ${error.message}`);
      } else {
        addResult('Storage Bucket', 'success', `Found ${data?.length || 0} files in storage`);
      }
    } catch (error) {
      addResult('Storage Bucket', 'warning', 'Could not check storage bucket');
    }

    // Test 3: Check browser video support
    const video = document.createElement('video');
    const formats = [
      { format: 'video/webm', name: 'WebM' },
      { format: 'video/mp4', name: 'MP4' },
      { format: 'video/webm;codecs=vp9', name: 'WebM VP9' },
      { format: 'video/webm;codecs=vp8', name: 'WebM VP8' },
    ];

    const supportedFormats = formats.filter(f => video.canPlayType(f.format) !== '');
    const unsupportedFormats = formats.filter(f => video.canPlayType(f.format) === '');

    if (supportedFormats.length > 0) {
      addResult('Video Support', 'success', `Supports: ${supportedFormats.map(f => f.name).join(', ')}`);
    }

    if (unsupportedFormats.length > 0) {
      addResult('Unsupported Formats', 'warning', `Not supported: ${unsupportedFormats.map(f => f.name).join(', ')}`);
    }

    // Test 4: Check MediaRecorder support
    if (typeof MediaRecorder !== 'undefined') {
      addResult('Recording Support', 'success', 'MediaRecorder API available');
      
      const recordingFormats = [
        'video/webm',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/mp4'
      ];
      
      const supportedRecording = recordingFormats.filter(format => 
        MediaRecorder.isTypeSupported(format)
      );
      
      if (supportedRecording.length > 0) {
        addResult('Recording Formats', 'success', `Can record: ${supportedRecording.join(', ')}`);
      } else {
        addResult('Recording Formats', 'error', 'No supported recording formats');
      }
    } else {
      addResult('Recording Support', 'error', 'MediaRecorder API not available');
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
          <Video className="w-5 h-5" />
          Recording Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isRunning} className="w-full">
          {isRunning ? 'Running Diagnostics...' : 'Check Recording Issues'}
        </Button>

        {diagnostics.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Results:</h3>
            {diagnostics.map((result, index) => (
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
          <p><strong>Common Recording Issues:</strong></p>
          <p>• Recording URL missing: Recording failed to upload to storage</p>
          <p>• Video won't play: Browser doesn't support WebM format</p>
          <p>• Storage bucket error: Supabase storage not configured</p>
          <p>• Recording table missing: Database migration not run</p>
          
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 font-medium">💡 Quick Fixes:</p>
            <p className="text-blue-700">• Try Chrome browser for best video support</p>
            <p className="text-blue-700">• Download recording and play in VLC if browser fails</p>
            <p className="text-blue-700">• Check Supabase storage bucket is created</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}