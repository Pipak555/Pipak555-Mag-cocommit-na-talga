import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Home, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Heart,
  Shield,
  Award,
  Users,
  HelpCircle,
  FileText,
  Lock,
  Globe,
  ChevronUp
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';
import { useState } from 'react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
      // Here you would typically send the email to your backend
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="mb-6">
                <Logo size="lg" showText={true} />
              </div>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Your gateway to amazing stays. Discover unique accommodations, 
                connect with hosts, and create unforgettable travel experiences.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-slate-300">
                  <Mail className="w-4 h-4 text-orange-400" />
                  <span className="text-sm">hello@mojodojocasahouse.com</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="text-sm">San Francisco, CA</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/guest/browse" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
                    <span className="group-hover:translate-x-1 transition-transform">Browse Listings</span>
                  </Link>
                </li>
                <li>
                  <Link to="/host/login" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
                    <span className="group-hover:translate-x-1 transition-transform">Become a Host</span>
                  </Link>
                </li>
                <li>
                  <Link to="/guest/dashboard" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
                    <span className="group-hover:translate-x-1 transition-transform">Guest Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/host/dashboard" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
                    <span className="group-hover:translate-x-1 transition-transform">Host Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/guest/wallet" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
                    <span className="group-hover:translate-x-1 transition-transform">Wallet</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Support</h4>
<ul className="space-y-3">
  <li>
    <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
      <HelpCircle className="w-4 h-4 mr-2" />
      <span className="group-hover:translate-x-1 transition-transform">Help Center</span>
    </a>
  </li>
  <li>
    <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
      <Mail className="w-4 h-4 mr-2" />
      <span className="group-hover:translate-x-1 transition-transform">Contact Us</span>
    </a>
  </li>
  <li>
    <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
      <Shield className="w-4 h-4 mr-2" />
      <span className="group-hover:translate-x-1 transition-transform">Safety</span>
    </a>
  </li>
  <li>
    <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
      <Users className="w-4 h-4 mr-2" />
      <span className="group-hover:translate-x-1 transition-transform">Accessibility</span>
    </a>
  </li>
  <li>
    <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center group">
      <Globe className="w-4 h-4 mr-2" />
      <span className="group-hover:translate-x-1 transition-transform">System Status</span>
    </a>
  </li>
</ul>
            </div>

            {/* Newsletter & Social */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Stay Connected</h4>
              
              {/* Newsletter */}
              <div className="mb-6">
                <p className="text-slate-300 text-sm mb-4">
                  Get the latest updates and exclusive offers
                </p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400"
                      required
                    />
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                    >
                      Subscribe
                    </Button>
                  </div>
                  {isSubscribed && (
                    <p className="text-green-400 text-sm flex items-center">
                      <Award className="w-4 h-4 mr-1" />
                      Thanks for subscribing!
                    </p>
                  )}
                </form>
              </div>

              {/* Social Links */}
              <div>
                <p className="text-slate-300 text-sm mb-4">Follow us</p>
                <div className="flex space-x-4">
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-slate-700 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors group"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-slate-700 hover:bg-blue-400 rounded-lg flex items-center justify-center transition-colors group"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-slate-700 hover:bg-pink-600 rounded-lg flex items-center justify-center transition-colors group"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                  <a 
                    href="#" 
                    className="w-10 h-10 bg-slate-700 hover:bg-blue-700 rounded-lg flex items-center justify-center transition-colors group"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              
              {/* Copyright & Legal */}
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-slate-400 text-sm">
                © 2024 Mojo Dojo Casa House. All rights reserved.
              </p>
              <div className="flex space-x-6">
  <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center">
    <Lock className="w-3 h-3 mr-1" />
    Privacy Policy
  </a>
  <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center">
    <FileText className="w-3 h-3 mr-1" />
    Terms of Service
  </a>
</div>
              </div>

              {/* Back to Top & Theme Toggle */}
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <Button
                  onClick={scrollToTop}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Back to Top
                </Button>
              </div>
            </div>

            {/* Made with Love */}
            <div className="mt-6 pt-6 border-t border-slate-700 text-center">
              <p className="text-slate-500 text-sm flex items-center justify-center">
                Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> by the Mojo Dojo Casa House team
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
