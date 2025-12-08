import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LessonCard } from '@/components/cards/LessonCard';
import { mockLessons } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = ['All', 'Basics', 'Vocabulary', 'Conversation', 'Grammar'];
const difficulties = ['All', 'beginner', 'intermediate', 'advanced'];

export default function Lessons() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const filteredLessons = mockLessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(search.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || lesson.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || lesson.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Lessons
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse and learn from our collection of sign language lessons
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search lessons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Difficulty Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-2 self-center">Difficulty:</span>
            {difficulties.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 capitalize",
                  selectedDifficulty === difficulty
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                )}
              >
                {difficulty === 'All' ? 'All Levels' : difficulty}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''}
          </p>

          {filteredLessons.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No lessons found matching your criteria</p>
              <Button 
                variant="ghost" 
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setSelectedDifficulty('All');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
