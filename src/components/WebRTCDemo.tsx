import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  PhoneOff,
  Users
} from 'lucide-react';

export function WebRTCDemo() {
  const { user, profile } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const demoRoomId = 'demo-room-123';

  const {
    participants,
    isConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenStream,
    localStream,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC({
    roomId: demoRoomId,
    userId: user?.id || 'demo-user',
    userName: profile?.name || 'Demo User',
    isHost: true,
  });

  const handleStartCall = async () => {
    const success = await startCall();
    if (success) {
      setIsInCall(true);
    }
  };

  const handleEndCall = () => {
    endCall();
    setIsInCall(false);
  };

  if (!isInCall) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>WebRTC Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Test the WebRTC video calling functionality. This will request camera and microphone permissions.
          </p>
          <Button onClick={handleStartCall} className="w-full">
            <Video className="w-4 h-4 mr-2" />
            Start Demo Call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">WebRTC Demo Call</h2>
        <Badge variant="destructive" className="animate-pulse">
          LIVE
        </Badge>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isScreenSharing && screenStream && (
          <div className="md:col-span-2">
            <VideoTile
              stream={screenStream}
              name="Screen Share"
              isScreenShare
              className="h-full"
            />
          </div>
        )}
        
        {participants.map((participant) => (
          <VideoTile
            key={participant.id}
            stream={participant.stream}
            name={participant.name}
            isHost={participant.isHost}
            isMuted={participant.id === user?.id ? isMuted : participant.isMuted}
            isVideoOff={participant.id === user?.id ? isVideoOff : participant.isVideoOff}
            isLocal={participant.id === user?.id}
            connectionState={participant.connectionState}
          />
        ))}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={isVideoOff ? "destructive" : "outline"}
              size="lg"
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "secondary" : "outline"}
              size="lg"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              End Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <Badge variant={p.isHost ? "default" : "secondary"}>
                  {p.name} {p.isHost && '(Host)'}
                </Badge>
                {p.id !== user?.id && (
                  <div className={`w-2 h-2 rounded-full ${
                    p.connectionState === 'connected' ? 'bg-green-500' :
                    p.connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    p.connectionState === 'failed' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connection Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            <p>Room ID: {demoRoomId}</p>
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Local Stream: {localStream ? 'Active' : 'None'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}