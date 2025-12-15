import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WebRTCSetupNotice() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const sqlScript = `-- WebRTC Setup (Safe to run multiple times)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_video_off BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Clean setup (handles existing policies)
DO $$ 
BEGIN
  -- Remove old policies
  DROP POLICY IF EXISTS "session_participants_select_policy" ON public.session_participants;
  DROP POLICY IF EXISTS "session_participants_insert_policy" ON public.session_participants;
  DROP POLICY IF EXISTS "session_participants_update_policy" ON public.session_participants;
  DROP POLICY IF EXISTS "session_participants_delete_policy" ON public.session_participants;
  
  -- Create new policies
  EXECUTE 'CREATE POLICY "session_participants_select_policy" ON public.session_participants FOR SELECT USING (true)';
  EXECUTE 'CREATE POLICY "session_participants_insert_policy" ON public.session_participants FOR INSERT WITH CHECK (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "session_participants_update_policy" ON public.session_participants FOR UPDATE USING (auth.uid() = user_id)';
  EXECUTE 'CREATE POLICY "session_participants_delete_policy" ON public.session_participants FOR DELETE USING (auth.uid() = user_id)';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add to realtime (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

SELECT 'WebRTC setup complete!' as result;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    toast({
      title: "Copied!",
      description: "SQL script copied to clipboard",
    });
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">WebRTC Setup Required</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800">
              To enable full video/audio streaming between participants, run the setup script in your Supabase SQL editor.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                WebRTC Connections Work
              </Badge>
              <Badge variant="outline" className="text-orange-700 border-orange-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Database Tracking Needed
              </Badge>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4 pt-3 border-t border-blue-200">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Setup Steps:</h4>
              <ol className="text-sm text-blue-800 space-y-1 ml-4">
                <li>1. Copy the SQL script below</li>
                <li>2. Go to your Supabase project → SQL Editor</li>
                <li>3. Paste and run the script</li>
                <li>4. Refresh this page</li>
              </ol>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <pre className="text-xs text-gray-300 overflow-x-auto pr-12">
                <code>{sqlScript}</code>
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="text-blue-700 border-blue-300"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Script
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-blue-700 border-blue-300"
              >
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open Supabase
                </a>
              </Button>
            </div>
            
            <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
              💡 <strong>Tip:</strong> If you get errors, the script is safe to run multiple times. 
              It will clean up any existing setup and create fresh policies.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}