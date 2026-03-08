import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  BookOpen,
  Radio,
  Hand,
  ArrowRight,
  Sparkles,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingWelcomeProps {
  userName?: string;
  onDismiss: () => void;
}

const steps = [
  {
    icon: BookOpen,
    title: 'Explore Lessons',
    description: 'Browse our library of sign language video lessons for all levels.',
    link: '/lessons',
    cta: 'Browse Lessons',
    color: 'text-blue-500',
  },
  {
    icon: Camera,
    title: 'Practice with AI',
    description: 'Use your camera to practice signs with real-time AI detection and feedback.',
    link: '/practice',
    cta: 'Start Practicing',
    color: 'text-emerald-500',
  },
  {
    icon: Hand,
    title: 'Try the 3D Avatar',
    description: 'See signs demonstrated by our 3D animated avatar — 50+ signs available.',
    link: '/practice',
    cta: 'See Avatar',
    color: 'text-violet-500',
  },
  {
    icon: Radio,
    title: 'Join Live Sessions',
    description: 'Connect with teachers and students in real-time video sessions.',
    link: '/live',
    cta: 'Go Live',
    color: 'text-orange-500',
  },
];

export function OnboardingWelcome({ userName, onDismiss }: OnboardingWelcomeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const markStepComplete = (index: number) => {
    if (!completedSteps.includes(index)) {
      setCompletedSteps(prev => [...prev, index]);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-lg overflow-hidden relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-7 w-7 z-10"
        onClick={onDismiss}
      >
        <X className="w-4 h-4" />
      </Button>

      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">
              Welcome{userName ? `, ${userName}` : ''}! 🎉
            </h2>
            <p className="text-sm text-muted-foreground">
              Here's how to get started with DeafLearn
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                completedSteps.includes(i)
                  ? 'bg-primary'
                  : i === currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isComplete = completedSteps.includes(index);

            return (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isComplete
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  )}
                  <span className="font-medium text-sm">{step.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {step.description}
                </p>
                <Link to={step.link} onClick={() => markStepComplete(index)}>
                  <Button variant="outline" size="sm" className="w-full text-xs h-7">
                    {step.cta} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {completedSteps.length === steps.length && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-sm font-medium text-primary">
              🎓 You've explored all the features! You're ready to learn.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
