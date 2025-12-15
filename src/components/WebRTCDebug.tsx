import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WebRTCDebugProps {
  localStream: MediaStream | null;
  participants: any[];
  isConnected: boolean;
}

export function WebRTCDebug({ localStream, participants, isConnected }: WebRTCDebugProps) {
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span>Connection Status:</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Local Stream:</span>
          <Badge variant={localStream ? "default" : "destructive"}>
            {localStream ? "Available" : "None"}
          </Badge>
        </div>
        
        {localStream && (
          <div className="text-yellow-700">
            <div>Video Tracks: {localStream.getVideoTracks().length}</div>
            <div>Audio Tracks: {localStream.getAudioTracks().length}</div>
            <div>Video Active: {localStream.getVideoTracks()[0]?.enabled ? "Yes" : "No"}</div>
            <div>Audio Active: {localStream.getAudioTracks()[0]?.enabled ? "Yes" : "No"}</div>
          </div>
        )}
        
        <div>
          <span>Participants: {participants.length}</span>
          {participants.map(p => (
            <div key={p.id} className="ml-2 text-yellow-700">
              {p.name}: {p.stream ? "Has Stream" : "No Stream"}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}