import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Camera, Hand } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveSessionDiagnosticProps {
  sessionId: string;
  userId: string;
  isHost: boolean;
}

export function LiveSessionDiagnostic({ sessionId, userId, isHost }: LiveSessionDiagnosticProps) {
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string) => {
      setDiagnostics(prev => [...prev, { test, status, message }]);
    };

    // Test 1: Check if sign_messages table exists
    try {
      const { data, error } = await supabase
        .from('sign_messages')
        .select('id')
        .limit(1);
      
      if (error) {
        addResult('Sign Messages Table', 'error', `Table not found: ${error.message}`);
      } else {
        addResult('Sign Messages Table', 'success', 'Table exists and accessible');
      }
    } catch (error) {
      addResult('Sign Messages Table', 'error', 'Failed to check table');
    }

    // Test 2: Check session participants table
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1);
      
      if (error) {
        addResult('Session Participants', 'warning', `Participants table issue: ${error.message}`);
      } else {
        addResult('Session Participants', 'success', `Found ${data?.length || 0} participants`);
      }
    } catch (error) {
      addResult('Session Participants', 'warning', 'Participants table not accessible');
    }

    // Test 3: Check raised hands table
    try {
      const { data, error } = await supabase
        .from('raised_hands')
        .select('*')
        .eq('session_id', sessionId);
      
      if (error) {
        addResult('Raised Hands', 'warning', `Raised hands table issue: ${error.message}`);
      } else {
        addResult('Raised Hands', 'success', `Found ${data?.length || 0} raised hands`);
      }
    } catch (error) {
      addResult('Raised Hands', 'warning', 'Raised hands table not accessible');
    }

    // Test 4: Check live session exists
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        addResult('Live Session', 'error', `Session not found: ${error.message}`);
      } else {
        addResult('Live Session', 'success', `Session "${data.title}" found (Status: ${data.status})`);
      }
    } catch (error) {
      addResult('Live Session', 'error', 'Failed to check session');
    }

    // Test 5: Check camera permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      addResult('Camera Access', 'success', 'Camera permission granted');
    } catch (error: any) {
      addResult('Camera Access', 'error', `Camera access failed: ${error.name}`);
    }

    // Test 6: Check MediaPipe hand detection
    try {
      if ((window as any).Hands) {
        addResult('Hand Detection', 'success', 'MediaPipe Hands available');
      } else {
        addResult('Hand Detection', 'warning', 'MediaPipe Hands not loaded yet');
      }
    } catch (error) {
      addResult('Hand Detection', 'error', 'Hand detection not available');
    }

    setIsRunning(false);
  };

  const fixSignDetection = async () => {
    // Tables are now created via migrations - this button just re-runs diagnostics
    toast({
      title: "Tables Configured",
      description: "Sign detection tables are set up via database migrations. Run diagnostics to verify.",
    });
    runDiagnostics();
  };

  const toast = (params: { title: string; description: string }) => {
    alert(`${params.title}: ${params.description}`);
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
          Live Session Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={isRunning} className="flex-1">
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
          
          <Button onClick={fixSignDetection} variant="outline">
            Fix Sign Detection
          </Button>
        </div>

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
          <p><strong>Common Issues:</strong></p>
          <p>• Sign detection not working: Run the SQL setup file in Supabase</p>
          <p>• Student camera not starting: Check camera permissions</p>
          <p>• Hand detection not working: MediaPipe may not be loaded</p>
          <p>• Session ID: {sessionId}</p>
          <p>• User Role: {isHost ? 'Host' : 'Participant'}</p>
        </div>
      </CardContent>
    </Card>
  );
}