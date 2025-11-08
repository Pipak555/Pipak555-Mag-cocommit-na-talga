import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VideoBackground } from '@/components/ui/video-background';
import { CategoryCardVideo } from '@/components/ui/category-card-video';
import { Home, Compass, Wrench, Users, Building2, Shield, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Footer from '@/components/shared/Footer';
import Logo from '@/components/shared/Logo';
import heroImage from '@/assets/hero-home.jpg';
// Import video background (replace with your actual video file)
// import landingVideo from '@/assets/videos/landing-hero.mp4';
const landingVideo = '/videos/landing-hero.mp4'; // Fallback to public folder
import homeIcon from '@/assets/category-home.png';
import experienceIcon from '@/assets/category-experience.png';
import serviceIcon from '@/assets/category-service.png';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 dark:bg-black/20 backdrop-blur-md border-b border-border/50 dark:border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Logo size="md" />
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Video Background */}
        <VideoBackground 
          src={landingVideo} 
          overlay={true}
          fallbackImage={heroImage}
        />
        
        {/* Enhanced Overlay - Lighter and more balanced */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/40 dark:from-black/60 via-background/20 dark:via-black/40 to-background/40 dark:to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 dark:from-black/70 via-transparent to-transparent z-10" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden z-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center animate-fadeInUp py-32">
          <div className="max-w-3xl">
            {/* Title with better contrast */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-foreground dark:text-white drop-shadow-2xl">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-orange-400 via-blue-400 to-green-400 bg-clip-text text-transparent drop-shadow-lg">
                Mojo Dojo Casa House
              </span>
            </h1>
            
            {/* Tagline with much better contrast */}
            <p className="text-xl md:text-2xl text-foreground/90 dark:text-white/95 mb-10 leading-relaxed max-w-2xl drop-shadow-lg font-medium">
              Your gateway to amazing stays. Connect with hosts and guests for unique experiences
            </p>
            
            {/* Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="shadow-2xl hover:shadow-2xl hover:scale-105 transition-all h-14 px-8 text-lg bg-primary hover:bg-primary/90">
                <Link to="/guest/login">Browse Listings</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-2 border-border/50 dark:border-white/30 bg-background/80 dark:bg-white/10 backdrop-blur-md hover:bg-background/90 dark:hover:bg-white/20 text-foreground dark:text-white hover:text-foreground dark:hover:text-white">
                <Link to="/host/login">Become a Host</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <ChevronDown className="h-6 w-6 text-foreground dark:text-white drop-shadow-lg" />
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Explore Categories</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the perfect experience for your needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <CategoryCardVideo
              videoSrc="/videos/category-home.mp4"
              fallbackImage={homeIcon}
              icon={Home}
              title="Homes"
              description="Discover comfortable stays for your next adventure"
              href="/guest/browse?category=home"
              colorClass="primary"
            />

            <CategoryCardVideo
              videoSrc="/videos/category-experience.mp4"
              fallbackImage={experienceIcon}
              icon={Compass}
              title="Experiences"
              description="Unique activities hosted by local experts"
              href="/guest/browse?category=experience"
              colorClass="secondary"
            />

            <CategoryCardVideo
              videoSrc="/videos/category-service.mp4"
              fallbackImage={serviceIcon}
              icon={Wrench}
              title="Services"
              description="Professional services for your property"
              href="/guest/browse?category=service"
              colorClass="accent"
            />
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Get Started</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Choose your role to access your personalized portal
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Guest Card */}
            <Card className="group relative overflow-hidden border-2 hover:border-primary transition-all duration-300">
              <div className="p-8 text-center">
                <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Guests</h3>
                <p className="text-muted-foreground mb-6 min-h-[48px]">
                  Find and book amazing places to stay and experiences to enjoy
                </p>
                <Button asChild className="w-full shadow-soft hover:shadow-medium transition-all">
                  <Link to="/guest/login">Guest Portal</Link>
                </Button>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-hero transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>

            {/* Host Card */}
            <Card className="group relative overflow-hidden border-2 hover:border-secondary transition-all duration-300">
              <div className="p-8 text-center">
                <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Hosts</h3>
                <p className="text-muted-foreground mb-6 min-h-[48px]">
                  Share your space and earn by hosting guests from around the world
                </p>
                <Button asChild className="w-full shadow-soft hover:shadow-medium transition-all" variant="secondary">
                  <Link to="/host/login">Host Portal</Link>
                </Button>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>

            {/* Admin Card */}
            <Card className="group relative overflow-hidden border-2 hover:border-accent transition-all duration-300">
              <div className="p-8 text-center">
                <div className="mb-6 mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Admin</h3>
                <p className="text-muted-foreground mb-6 min-h-[48px]">
                  Manage platform operations, policies, and user activities
                </p>
                <Button asChild className="w-full shadow-soft hover:shadow-medium transition-all" variant="outline">
                  <Link to="/admin/login">Admin Portal</Link>
                </Button>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-accent transform scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Landing;
