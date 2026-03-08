import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, Trash2, Languages, Sparkles, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAITutor } from '@/hooks/useAITutor';
import { FingerspellingDisplay } from './FingerspellingDisplay';

interface AITutorChatProps {
  detectedSigns?: { sign: string; confidence: number }[];
  className?: string;
}

// Extract words that the tutor suggests to fingerspell
function extractSpellableWords(messages: { role: string; content: string }[]): string[] {
  const words: string[] = [];
  const patterns = [
    /fingerspell(?:ing)?\s+["']?(\w+)["']?/gi,
    /spell(?:ing)?\s+(?:out\s+)?["']?(\w+)["']?/gi,
    /spell\s+it[:\s]+["']?(\w+)["']?/gi,
    /letter[s]?\s+(?:in|of|for)\s+["']?(\w+)["']?/gi,
  ];

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(msg.content)) !== null) {
        const w = match[1];
        if (w && w.length >= 2 && w.length <= 20 && !['the', 'this', 'that', 'out', 'it'].includes(w.toLowerCase())) {
          words.push(w);
        }
      }
    }
  }
  return [...new Set(words)];
}

export function AITutorChat({ detectedSigns, className }: AITutorChatProps) {
  const [input, setInput] = useState('');
  const [translateInput, setTranslateInput] = useState('');
  const [mode, setMode] = useState<'tutor' | 'translate'>('tutor');
  const [showSpelling, setShowSpelling] = useState(false);
  const [spellingWord, setSpellingWord] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, clearMessages, requestFeedback, translateText } = useAITutor();

  const spellableWords = useMemo(() => extractSpellableWords(messages), [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim(), 'tutor');
    setInput('');
  };

  const handleTranslate = () => {
    if (!translateInput.trim() || isLoading) return;
    translateText(translateInput.trim());
    setTranslateInput('');
    setMode('tutor');
  };

  const handleFeedback = () => {
    if (!detectedSigns?.length || isLoading) return;
    requestFeedback(detectedSigns);
  };

  const handleSpellWord = (word: string) => {
    setSpellingWord(word);
    setShowSpelling(true);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Card className="border-border/50 shadow-card flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              AI Sign Tutor
            </CardTitle>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={mode === 'tutor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('tutor')}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Chat
              </Button>
              <Button
                variant={mode === 'translate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('translate')}
              >
                <Languages className="w-3 h-3 mr-1" />
                Translate
              </Button>
              <Button
                variant={showSpelling ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setShowSpelling(!showSpelling);
                  if (showSpelling) setSpellingWord(undefined);
                }}
              >
                <Hand className="w-3 h-3 mr-1" />
                Spell
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-3" style={{ maxHeight: '400px' }}>
            <div ref={scrollRef} className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {mode === 'translate'
                      ? 'Enter English text to get ASL translation instructions'
                      : 'Ask me anything about ASL! I can teach signs, give feedback, or help you practice.'}
                  </p>
                  {detectedSigns && detectedSigns.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleFeedback}
                      disabled={isLoading}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Get feedback on my practice
                    </Button>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Spell this for me — quick action buttons */}
          {spellableWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spellableWords.slice(-3).map((w) => (
                <Button
                  key={w}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => handleSpellWord(w)}
                >
                  <Hand className="w-3 h-3" />
                  Spell "{w}"
                </Button>
              ))}
            </div>
          )}

          {/* Quick actions */}
          {detectedSigns && detectedSigns.length > 0 && messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleFeedback}
              disabled={isLoading}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Get feedback on {detectedSigns.length} detected signs
            </Button>
          )}

          {/* Input */}
          {mode === 'translate' ? (
            <div className="flex gap-2">
              <Input
                value={translateInput}
                onChange={(e) => setTranslateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                placeholder="Enter English text to translate to ASL..."
                disabled={isLoading}
              />
              <Button size="icon" onClick={handleTranslate} disabled={isLoading || !translateInput.trim()}>
                <Languages className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about ASL signs, grammar, or Deaf culture..."
                disabled={isLoading}
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fingerspelling Display */}
      {showSpelling && <FingerspellingDisplay initialWord={spellingWord} key={spellingWord || 'manual'} />}
    </div>
  );
}
