import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WebRTCDebugInfoProps {
  participants: any[];
  isConnected: boolean;
  localStream: MediaStream | null;
  activeSession: any;
  user: any;
  className?: string;
}

export function WebRTCDebugInfo({ 
  participants, 
  isConnected, 
  localStream, 
  activeSession, 
  user,
  className = "" 
}: WebRTCDebugInfoProps) {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-800">WebRTC Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              Connected: {isConnected ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            <Badge variant={localStream ? "default" : "destructive"} className="text-xs">
              Local Stream: {localStream ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-1">
          <p><strong>Session:</strong> {activeSession?.id || 'None'}</p>
          <p><strong>User:</strong> {user?.id?.slice(0, 8) || 'None'}</p>
          <p><strong>Participants:</strong> {participants.length}</p>
          <p><strong>Local Stream ID:</strong> {localStream?.id || 'None'}</p>
          <p><strong>Video Tracks:</strong> {localStream?.getVideoTracks().length || 0}</p>
          <p><strong>Audio Tracks:</strong> {localStream?.getAudioTracks().length || 0}</p>
        </div>

        {participants.length > 0 && (
          <div>
            <p><strong>Participant Streams:</strong></p>
            {participants.map((p, i) => (
              <p key={i} className="ml-2">
                {p.name}: {p.stream ? '✅' : '❌'} {p.stream?.id?.slice(0, 8)}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}