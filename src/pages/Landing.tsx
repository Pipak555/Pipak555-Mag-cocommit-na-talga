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
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Explore Categories</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center shadow-soft hover:shadow-hover transition-smooth cursor-pointer bg-gradient-card">
              <img src={homeIcon} alt="Home" className="w-24 h-24 mx-auto mb-4" />
              <Home className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Homes</h3>
              <p className="text-muted-foreground">Discover comfortable stays for your next adventure</p>
            </Card>

            <Card className="p-8 text-center shadow-soft hover:shadow-hover transition-smooth cursor-pointer bg-gradient-card">
              <img src={experienceIcon} alt="Experience" className="w-24 h-24 mx-auto mb-4" />
              <Compass className="w-8 h-8 mx-auto mb-3 text-secondary" />
              <h3 className="text-xl font-semibold mb-2">Experiences</h3>
              <p className="text-muted-foreground">Unique activities hosted by local experts</p>
            </Card>

            <Card className="p-8 text-center shadow-soft hover:shadow-hover transition-smooth cursor-pointer bg-gradient-card">
              <img src={serviceIcon} alt="Service" className="w-24 h-24 mx-auto mb-4" />
              <Wrench className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="text-xl font-semibold mb-2">Services</h3>
              <p className="text-muted-foreground">Professional services for your property</p>
            </Card>
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
