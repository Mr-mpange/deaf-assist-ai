import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function WebRTCStatus() {
  const [status, setStatus] = useState<{
    database: 'checking' | 'available' | 'unavailable';
    webrtc: 'checking' | 'available' | 'unavailable';
    https: 'available' | 'unavailable';
  }>({
    database: 'checking',
    webrtc: 'checking', 
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'available' : 'unavailable'
  });

  useEffect(() => {
    checkDatabaseStatus();
    checkWebRTCStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      await supabase
        .from('session_participants')
        .select('id')
        .limit(1);
      setStatus(prev => ({ ...prev, database: 'available' }));
    } catch (error) {
      setStatus(prev => ({ ...prev, database: 'unavailable' }));
    }
  };

  const checkWebRTCStatus = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setStatus(prev => ({ ...prev, webrtc: 'available' }));
      } else {
        setStatus(prev => ({ ...prev, webrtc: 'unavailable' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, webrtc: 'unavailable' }));
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'unavailable':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Not Available</Badge>;
      default:
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <h4 className="font-medium mb-3">WebRTC System Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.database)}
              <span className="text-sm">Database Setup</span>
            </div>
            {getStatusBadge(status.database)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.webrtc)}
              <span className="text-sm">WebRTC Support</span>
            </div>
            {getStatusBadge(status.webrtc)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.https)}
              <span className="text-sm">HTTPS/Localhost</span>
            </div>
            {getStatusBadge(status.https)}
          </div>
        </div>
        
        {status.database === 'available' && status.webrtc === 'available' && status.https === 'available' && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✅ All systems ready for live video sessions!
          </div>
        )}
      </CardContent>
    </Card>
  );
}