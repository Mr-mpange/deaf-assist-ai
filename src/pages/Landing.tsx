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
  Globe,
  Trophy,
  Flame
} from 'lucide-react';
import heroImage from '@/assets/hero-sign-language.jpg';
import practiceImage from '@/assets/sign-hands-practice.jpg';
import liveClassImage from '@/assets/live-class-session.jpg';
import aiPracticeImage from '@/assets/ai-practice-feature.jpg';

const features = [
  {
    icon: Video,
    title: 'Interactive Lessons',
    description: 'Learn sign language through professionally crafted video lessons with native signers.',
    image: liveClassImage,
  },
  {
    icon: Camera,
    title: 'AI-Powered Practice',
    description: 'Practice signs with real-time AI feedback using your webcam.',
    image: aiPracticeImage,
  },
  {
    icon: Users,
    title: 'Live Classes',
    description: 'Join live sessions with instructors for real-time learning and Q&A.',
    image: liveClassImage,
  },
  {
    icon: Brain,
    title: 'Smart Progress',
    description: 'Track your learning journey with personalized recommendations.',
    image: practiceImage,
  },
];

const stats = [
  { value: '10K+', label: 'Active Learners', icon: Users },
  { value: '500+', label: 'Video Lessons', icon: Video },
  { value: '50+', label: 'Expert Teachers', icon: GraduationCap },
  { value: '95%', label: 'Satisfaction Rate', icon: Trophy },
];

const testimonials = [
  { name: 'Sarah M.', role: 'Student', text: 'DeafLearn made it so easy to start learning ASL. The AI practice is incredible!' },
  { name: 'James K.', role: 'Teacher', text: 'The live session tools are the best I\'ve used. My students love the interactive features.' },
  { name: 'Maria L.', role: 'Student', text: 'I went from zero to conversational in 3 months. The streak system keeps me motivated.' },
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
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
                <Sparkles className="w-4 h-4" />
                AI-Powered Sign Language Learning
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 animate-slide-in-up">
                Learn Sign Language
                <span className="block text-gradient">The Smart Way</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
                Master sign language with interactive lessons, real-time AI practice, 
                and live classes from expert instructors.
              </p>

              <div className="flex items-center gap-6 mb-8 animate-slide-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" /> Free to start
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" /> AI feedback
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" /> Live classes
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start gap-4 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
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

            {/* Right: Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={heroImage} 
                  alt="Students learning sign language together" 
                  className="w-full h-auto object-cover animate-float"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
              </div>
              
              {/* Floating stats card */}
              <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-card border border-border/50 animate-bounce-soft">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">12 Day Streak!</p>
                    <p className="text-xs text-muted-foreground">Keep it going 🔥</p>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-card rounded-xl p-3 shadow-card border border-border/50 animate-bounce-soft" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold">Top 5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, i) => (
              <div key={i} className="relative bg-card rounded-2xl p-6 text-center shadow-card border border-border/50 hover:-translate-y-1 transition-transform duration-300">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold text-gradient">{stat.value}</p>
                <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section with Images */}
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

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-lg transition-all duration-500 hover:-translate-y-2 border border-border/50"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                      <feature.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to start your sign language journey</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Sign Up Free', desc: 'Create your account in seconds and set your learning goals.', icon: ArrowRight },
              { step: '02', title: 'Watch & Practice', desc: 'Follow video lessons then practice with AI-powered real-time feedback.', icon: Camera },
              { step: '03', title: 'Join Live Classes', desc: 'Connect with expert teachers and fellow learners in live sessions.', icon: Users },
            ].map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className="text-6xl font-extrabold text-primary/10 mb-4 group-hover:text-primary/20 transition-colors">
                  {item.step}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow group-hover:scale-110 transition-transform">
                  <item.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by Learners</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-card border border-border/50 hover:-translate-y-1 transition-transform">
                <p className="text-muted-foreground mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-primary p-8 sm:p-12 overflow-hidden">
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
            © 2025 DeafLearn. Making sign language accessible to everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}
