import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, Compass, Wrench, Users, Building2, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import heroImage from '@/assets/hero-home.jpg';
import homeIcon from '@/assets/category-home.png';
import experienceIcon from '@/assets/category-experience.png';
import serviceIcon from '@/assets/category-service.png';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            StayHub
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/40" />
        </div>
        
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 max-w-2xl">
            Welcome to <span className="bg-gradient-hero bg-clip-text text-transparent">StayHub</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-xl">
            Connect hosts and guests for unique stays, experiences, and services
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button size="lg" asChild className="shadow-hover transition-smooth">
              <Link to="/guest/login">Browse Listings</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="transition-smooth">
              <Link to="/host/login">Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Explore Categories</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the perfect experience for your needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Link to="/guest/browse" className="group block">
              <Card className="p-8 text-center shadow-medium hover:shadow-hover transition-all duration-300 border-2 border-transparent hover:border-primary/50 bg-card h-full">
                <div className="mb-6 relative">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden bg-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src={homeIcon} alt="Home" className="w-24 h-24 object-contain" />
                  </div>
                  <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Home className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">Homes</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Discover comfortable stays for your next adventure
                </p>
              </Card>
            </Link>

            <Link to="/guest/browse" className="group block">
              <Card className="p-8 text-center shadow-medium hover:shadow-hover transition-all duration-300 border-2 border-transparent hover:border-secondary/50 bg-card h-full">
                <div className="mb-6 relative">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden bg-secondary/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src={experienceIcon} alt="Experience" className="w-24 h-24 object-contain" />
                  </div>
                  <div className="w-14 h-14 mx-auto rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                    <Compass className="w-7 h-7 text-secondary" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-secondary transition-colors">Experiences</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Unique activities hosted by local experts
                </p>
              </Card>
            </Link>

            <Link to="/guest/browse" className="group block">
              <Card className="p-8 text-center shadow-medium hover:shadow-hover transition-all duration-300 border-2 border-transparent hover:border-accent/50 bg-card h-full">
                <div className="mb-6 relative">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden bg-accent/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src={serviceIcon} alt="Service" className="w-24 h-24 object-contain" />
                  </div>
                  <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Wrench className="w-7 h-7 text-accent" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">Services</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Professional services for your property
                </p>
              </Card>
            </Link>
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
      <footer className="bg-muted py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2025 StayHub. Built with Firebase & React.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
