import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Play, 
  Users, 
  Camera, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Video,
  Brain,
  Globe
} from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Interactive Lessons',
    description: 'Learn sign language through professionally crafted video lessons with native signers.',
  },
  {
    icon: Camera,
    title: 'AI-Powered Practice',
    description: 'Practice signs with real-time AI feedback using your webcam.',
  },
  {
    icon: Users,
    title: 'Live Classes',
    description: 'Join live sessions with instructors for real-time learning and Q&A.',
  },
  {
    icon: Brain,
    title: 'Smart Progress',
    description: 'Track your learning journey with personalized recommendations.',
  },
];

const stats = [
  { value: '10K+', label: 'Active Learners' },
  { value: '500+', label: 'Video Lessons' },
  { value: '50+', label: 'Expert Teachers' },
  { value: '95%', label: 'Satisfaction Rate' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">DeafLearn</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="gradient">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background decorations */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              AI-Powered Sign Language Learning
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 animate-slide-in-up">
              Learn Sign Language
              <span className="block text-gradient">The Smart Way</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
              Master sign language with interactive lessons, real-time AI practice, 
              and live classes from expert instructors. Start your journey today.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/register">
                <Button size="xl" variant="hero" className="group">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button size="xl" variant="outline" className="gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-bold text-gradient">{stat.value}</p>
                <p className="text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our platform combines modern technology with proven teaching methods 
              to make learning sign language accessible and effective.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-border/50"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-primary p-8 sm:p-12 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl" />
            
            <div className="relative text-center">
              <Globe className="w-12 h-12 mx-auto mb-6 text-primary-foreground opacity-80" />
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of learners who are breaking communication barriers 
                through sign language.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="font-semibold">
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">DeafLearn</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 DeafLearn. Making sign language accessible to everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}
