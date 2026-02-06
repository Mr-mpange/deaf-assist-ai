import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Eraser, 
  Trash2, 
  Download, 
  Palette,
  Undo,
  Redo
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Point {
  x: number;
  y: number;
}

interface DrawAction {
  type: 'draw' | 'erase';
  points: Point[];
  color: string;
  size: number;
}

interface SessionWhiteboardProps {
  sessionId: string;
  isHost: boolean;
  participantName: string;
}

const COLORS = [
  '#000000', // Black
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White (eraser effect)
];

export function SessionWhiteboard({ 
  sessionId, 
  isHost,
  participantName 
}: SessionWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const currentPath = useRef<Point[]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Subscribe to whiteboard updates
  useEffect(() => {
    const channel = supabase
      .channel(`whiteboard-${sessionId}`)
      .on('broadcast', { event: 'draw' }, (payload) => {
        const action = payload.payload as DrawAction;
        drawAction(action);
      })
      .on('broadcast', { event: 'clear' }, () => {
        clearCanvas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const drawAction = useCallback((action: DrawAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || action.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = action.type === 'erase' ? '#FFFFFF' : action.color;
    ctx.lineWidth = action.type === 'erase' ? action.size * 3 : action.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(action.points[0].x, action.points[0].y);
    for (let i = 1; i < action.points.length; i++) {
      ctx.lineTo(action.points[i].x, action.points[i].y);
    }
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and fill with white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all actions up to current index
    for (let i = 0; i <= historyIndex; i++) {
      drawAction(history[i]);
    }
  }, [history, historyIndex, drawAction]);

  useEffect(() => {
    redrawCanvas();
  }, [historyIndex, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isHost) return; // Only host can draw
    
    e.preventDefault();
    setIsDrawing(true);
    const point = getCanvasCoords(e);
    currentPath.current = [point];
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isHost) return;
    
    e.preventDefault();
    const point = getCanvasCoords(e);
    currentPath.current.push(point);

    // Draw locally for immediate feedback
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = currentPath.current;
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const lastTwo = points.slice(-2);
    ctx.moveTo(lastTwo[0].x, lastTwo[0].y);
    ctx.lineTo(lastTwo[1].x, lastTwo[1].y);
    ctx.stroke();
  };

  const stopDrawing = async () => {
    if (!isDrawing || !isHost) return;
    
    setIsDrawing(false);

    if (currentPath.current.length > 1) {
      const action: DrawAction = {
        type: tool === 'eraser' ? 'erase' : 'draw',
        points: [...currentPath.current],
        color,
        size: brushSize,
      };

      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(action);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Broadcast to other participants
      await supabase
        .channel(`whiteboard-${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'draw',
          payload: action,
        });
    }

    currentPath.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClear = async () => {
    clearCanvas();
    setHistory([]);
    setHistoryIndex(-1);

    await supabase
      .channel(`whiteboard-${sessionId}`)
      .send({
        type: 'broadcast',
        event: 'clear',
        payload: {},
      });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${sessionId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Whiteboard
          </span>
          {!isHost && (
            <Badge variant="secondary">View Only</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toolbar - Only for host */}
        {isHost && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
            {/* Tools */}
            <div className="flex gap-1">
              <Button
                variant={tool === 'pen' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTool('pen')}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTool('eraser')}
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            {/* Colors */}
            <div className="flex gap-1">
              {COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-primary' : 'border-border'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2 min-w-[100px]">
              <Slider
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                min={1}
                max={20}
                step={1}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground w-4">{brushSize}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex < 0}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative bg-white rounded-lg border border-border overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`w-full h-64 ${isHost ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Student hint */}
        {!isHost && (
          <p className="text-xs text-muted-foreground text-center">
            Watch the teacher demonstrate signs on the whiteboard
          </p>
        )}
      </CardContent>
    </Card>
  );
}
