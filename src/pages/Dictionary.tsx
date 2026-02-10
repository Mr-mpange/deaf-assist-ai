import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  BookOpen,
  Hand,
  ArrowRight,
  Volume2,
  Hash,
  MessageCircle,
  HelpCircle,
  Star,
  Type,
} from 'lucide-react';
import { signLanguageDictionary, SignDefinition } from '@/data/signLanguageDictionary';
import { Link } from 'react-router-dom';

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  alphabet: { label: 'Alphabet', icon: Type, color: 'bg-primary/10 text-primary' },
  number: { label: 'Numbers', icon: Hash, color: 'bg-secondary/20 text-secondary-foreground' },
  common: { label: 'Common', icon: Star, color: 'bg-accent/10 text-accent' },
  greeting: { label: 'Greetings', icon: Hand, color: 'bg-success/10 text-success' },
  question: { label: 'Questions', icon: HelpCircle, color: 'bg-info/10 text-info' },
  phrase: { label: 'Phrases', icon: MessageCircle, color: 'bg-warning/10 text-warning' },
};

export default function Dictionary() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSign, setSelectedSign] = useState<SignDefinition | null>(null);

  const allSigns = useMemo(() => Object.values(signLanguageDictionary), []);

  const filteredSigns = useMemo(() => {
    let signs = allSigns;
    if (selectedCategory !== 'all') {
      signs = signs.filter(s => s.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      signs = signs.filter(
        s =>
          s.word.includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.handShape.toLowerCase().includes(q)
      );
    }
    return signs;
  }, [allSigns, selectedCategory, search]);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    allSigns.forEach(s => cats.set(s.category, (cats.get(s.category) || 0) + 1));
    return cats;
  }, [allSigns]);

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Sign Dictionary
          </h1>
          <p className="text-muted-foreground mt-1">
            Look up ASL signs — {allSigns.length} signs available
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search signs by word, description, or hand shape..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
          >
            All ({allSigns.length})
          </Button>
          {Array.from(categories.entries()).map(([cat, count]) => {
            const config = categoryConfig[cat];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                {config.label} ({count})
              </Button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sign Grid */}
          <div className="lg:col-span-2">
            {filteredSigns.length === 0 ? (
              <Card className="border-border/50 shadow-card">
                <CardContent className="p-12 text-center">
                  <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No signs found matching "{search}"</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredSigns.map(sign => {
                  const config = categoryConfig[sign.category];
                  const isSelected = selectedSign?.word === sign.word;
                  return (
                    <Card
                      key={sign.word}
                      className={`border-border/50 shadow-card cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                        isSelected ? 'ring-2 ring-primary border-primary/30' : ''
                      }`}
                      onClick={() => setSelectedSign(sign)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold capitalize">{sign.word}</h3>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={e => {
                                e.stopPropagation();
                                speakWord(sign.word);
                              }}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </Button>
                            {config && (
                              <Badge variant="outline" className={`text-xs ${config.color}`}>
                                {config.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {sign.description}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          <span className="font-medium">Hand:</span> {sign.handShape}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {selectedSign ? (
              <>
                <Card className="border-primary/30 bg-primary/5 shadow-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl capitalize">{selectedSign.word}</CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => speakWord(selectedSign.word)}
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {categoryConfig[selectedSign.category]?.label || selectedSign.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedSign.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Hand Shape</p>
                      <p className="text-sm text-muted-foreground">{selectedSign.handShape}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Movement</p>
                      <p className="text-sm text-muted-foreground">{selectedSign.movement}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Position</p>
                      <p className="text-sm text-muted-foreground">{selectedSign.position}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Steps */}
                <Card className="border-border/50 shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">How to Sign</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {selectedSign.animationSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                <Link to="/practice">
                  <Button className="w-full">
                    <Hand className="w-4 h-4 mr-2" />
                    Practice This Sign
                  </Button>
                </Link>
              </>
            ) : (
              <Card className="border-border/50 shadow-card">
                <CardContent className="p-8 text-center">
                  <Hand className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Select a sign to see detailed instructions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
