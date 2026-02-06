import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Plus, 
  X, 
  Shuffle, 
  ArrowRight,
  DoorOpen
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  name: string;
}

interface BreakoutRoom {
  id: string;
  name: string;
  participants: Participant[];
}

interface BreakoutRoomsPanelProps {
  sessionId: string;
  participantId: string;
  participantName: string;
  isHost: boolean;
  allParticipants: Participant[];
}

export function BreakoutRoomsPanel({
  sessionId,
  participantId,
  participantName,
  isHost,
  allParticipants,
}: BreakoutRoomsPanelProps) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');

  // Subscribe to breakout room updates
  useEffect(() => {
    const channel = supabase
      .channel(`breakout-${sessionId}`)
      .on('broadcast', { event: 'rooms_update' }, (payload) => {
        const data = payload.payload as { rooms: BreakoutRoom[]; active: boolean };
        setRooms(data.rooms);
        setIsActive(data.active);
        
        // Find which room this participant is in
        const myRoom = data.rooms.find(r => 
          r.participants.some(p => p.id === participantId)
        );
        setCurrentRoom(myRoom?.id || null);
      })
      .on('broadcast', { event: 'rooms_ended' }, () => {
        setRooms([]);
        setIsActive(false);
        setCurrentRoom(null);
        toast({
          title: "Breakout Ended",
          description: "Returning to main session",
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, participantId, toast]);

  const broadcastRooms = async (updatedRooms: BreakoutRoom[], active: boolean) => {
    await supabase
      .channel(`breakout-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'rooms_update',
        payload: { rooms: updatedRooms, active },
      });
  };

  const createRoom = () => {
    const name = newRoomName.trim() || `Room ${rooms.length + 1}`;
    const newRoom: BreakoutRoom = {
      id: crypto.randomUUID(),
      name,
      participants: [],
    };
    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    setNewRoomName('');
    broadcastRooms(updatedRooms, isActive);
  };

  const deleteRoom = (roomId: string) => {
    const updatedRooms = rooms.filter(r => r.id !== roomId);
    setRooms(updatedRooms);
    broadcastRooms(updatedRooms, isActive);
  };

  const assignToRoom = (participantId: string, participantName: string, roomId: string) => {
    const updatedRooms = rooms.map(room => ({
      ...room,
      participants: room.id === roomId
        ? [...room.participants.filter(p => p.id !== participantId), { id: participantId, name: participantName }]
        : room.participants.filter(p => p.id !== participantId),
    }));
    setRooms(updatedRooms);
    broadcastRooms(updatedRooms, isActive);
  };

  const removeFromRoom = (participantId: string) => {
    const updatedRooms = rooms.map(room => ({
      ...room,
      participants: room.participants.filter(p => p.id !== participantId),
    }));
    setRooms(updatedRooms);
    broadcastRooms(updatedRooms, isActive);
  };

  const shuffleParticipants = () => {
    if (rooms.length === 0) return;

    const shuffled = [...allParticipants].sort(() => Math.random() - 0.5);
    const updatedRooms = rooms.map(room => ({ ...room, participants: [] as Participant[] }));
    
    shuffled.forEach((participant, index) => {
      const roomIndex = index % rooms.length;
      updatedRooms[roomIndex].participants.push(participant);
    });

    setRooms(updatedRooms);
    broadcastRooms(updatedRooms, isActive);
  };

  const startBreakout = async () => {
    setIsActive(true);
    await broadcastRooms(rooms, true);
    toast({
      title: "Breakout Started",
      description: "Participants have been moved to their rooms",
    });
  };

  const endBreakout = async () => {
    setIsActive(false);
    setCurrentRoom(null);
    await supabase
      .channel(`breakout-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'rooms_ended',
        payload: {},
      });
    setRooms([]);
    toast({
      title: "Breakout Ended",
      description: "All participants returned to main session",
    });
  };

  // Unassigned participants
  const assignedIds = new Set(rooms.flatMap(r => r.participants.map(p => p.id)));
  const unassigned = allParticipants.filter(p => !assignedIds.has(p.id));

  // Host view
  if (isHost) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Breakout Rooms
            </span>
            {isActive && (
              <Badge variant="default" className="bg-success">Active</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isActive ? (
            <>
              {/* Create room */}
              <div className="flex gap-2">
                <Input
                  placeholder="Room name (optional)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={createRoom} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Rooms list */}
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <div key={room.id} className="p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{room.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {room.participants.length}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRoom(room.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {room.participants.map((p) => (
                          <Badge
                            key={p.id}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-destructive/10"
                            onClick={() => removeFromRoom(p.id)}
                          >
                            {p.name} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Unassigned participants */}
              {unassigned.length > 0 && (
                <div className="p-2 border border-dashed rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Unassigned ({unassigned.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {unassigned.map((p) => (
                      <div key={p.id} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {p.name}
                        </Badge>
                        {rooms.length > 0 && (
                          <select
                            className="text-xs bg-transparent border rounded px-1"
                            onChange={(e) => assignToRoom(p.id, p.name, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>→</option>
                            {rooms.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={shuffleParticipants}
                  disabled={rooms.length === 0}
                  className="flex-1"
                >
                  <Shuffle className="w-4 h-4 mr-1" />
                  Shuffle
                </Button>
                <Button
                  onClick={startBreakout}
                  disabled={rooms.length === 0}
                  className="flex-1"
                  variant="gradient"
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Start
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Active rooms */}
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <div key={room.id} className="p-2 bg-success/10 border border-success/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{room.name}</span>
                        <Badge className="bg-success text-xs">
                          {room.participants.length} students
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {room.participants.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button onClick={endBreakout} variant="destructive" className="w-full">
                <DoorOpen className="w-4 h-4 mr-1" />
                End Breakout
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Student view
  if (!isActive) return null;

  const myRoom = rooms.find(r => r.participants.some(p => p.id === participantId));

  return (
    <Card className="border-primary/30 shadow-card bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Breakout Room
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myRoom ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{myRoom.name}</span>
              <Badge className="bg-success">{myRoom.participants.length} members</Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {myRoom.participants.map((p) => (
                <Badge 
                  key={p.id} 
                  variant={p.id === participantId ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {p.name} {p.id === participantId && '(you)'}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Practice with your group members
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven't been assigned to a room yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
