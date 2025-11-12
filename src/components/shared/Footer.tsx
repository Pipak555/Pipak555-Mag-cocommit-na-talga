import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  FileText,
  Lock,
  ChevronUp
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Logo from '@/components/shared/Logo';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 lg:py-8">
        {/* Mobile Layout - Compact */}
        <div className="block sm:hidden space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="mb-1.5">
                <Logo size="sm" showText={true} />
              </div>
              <p className="text-muted-foreground text-xs">
                Your gateway to amazing stays.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <Button
                onClick={scrollToTop}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs h-8 px-2 touch-manipulation"
              >
                <ChevronUp className="w-3 h-3 mr-1" />
                Top
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-semibold mb-1.5 text-foreground">Quick Links</h4>
              <ul className="space-y-1">
                <li>
                  <Link to="/guest/browse" className="text-muted-foreground hover:text-primary text-xs transition-colors">
                    Browse Listings
                  </Link>
                </li>
                <li>
                  <Link to="/host/login" className="text-muted-foreground hover:text-primary text-xs transition-colors">
                    Become a Host
                  </Link>
                </li>
                <li>
                  <Link to="/guest/dashboard" className="text-muted-foreground hover:text-primary text-xs transition-colors">
                    Guest Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/host/dashboard" className="text-muted-foreground hover:text-primary text-xs transition-colors">
                    Host Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold mb-1.5 text-foreground">Legal</h4>
              <ul className="space-y-1">
                <li>
                  <a href="mailto:hello@mojodojocasahouse.com" className="text-muted-foreground hover:text-primary text-xs transition-colors flex items-center">
                    <Lock className="w-3 h-3 mr-1 flex-shrink-0" />
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@mojodojocasahouse.com" className="text-muted-foreground hover:text-primary text-xs transition-colors flex items-center">
                    <FileText className="w-3 h-3 mr-1 flex-shrink-0" />
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Logo & Brand */}
          <div>
            <div className="mb-2 sm:mb-3 md:mb-4">
              <Logo size="md" showText={true} />
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Your gateway to amazing stays.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 md:mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link to="/guest/browse" className="text-muted-foreground hover:text-primary text-xs sm:text-sm transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link to="/host/login" className="text-muted-foreground hover:text-primary text-xs sm:text-sm transition-colors">
                  Become a Host
                </Link>
              </li>
              <li>
                <Link to="/guest/dashboard" className="text-muted-foreground hover:text-primary text-xs sm:text-sm transition-colors">
                  Guest Dashboard
                </Link>
              </li>
              <li>
                <Link to="/host/dashboard" className="text-muted-foreground hover:text-primary text-xs sm:text-sm transition-colors">
                  Host Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Actions */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 md:mb-4 text-foreground">Legal</h4>
            <ul className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
              <li>
                <a href="mailto:hello@mojodojocasahouse.com" className="text-muted-foreground hover:text-primary text-xs sm:text-sm transition-colors flex items-center">
                  <Lock className="w-3 h-3 mr-1.5 sm:mr-2 flex-shrink-0" />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="mailto:hello@mojodojocasahouse.com" className="text-muted-foreground hover:text-primary text-xs sm:text-sm transition-colors flex items-center">
                  <FileText className="w-3 h-3 mr-1.5 sm:mr-2 flex-shrink-0" />
                  Terms of Service
                </a>
              </li>
            </ul>
            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
              <ThemeToggle />
              <Button
                onClick={scrollToTop}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 touch-manipulation"
              >
                <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Back to Top</span>
                <span className="sm:hidden">Top</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-2 sm:pt-3 md:pt-4 lg:pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-muted-foreground text-xs text-center md:text-left">
              © 2024 Mojo Dojo Casa House. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
