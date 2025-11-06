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
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Logo & Brand */}
          <div>
            <div className="mb-4">
              <Logo size="md" showText={true} />
            </div>
            <p className="text-slate-400 text-sm">
              Your gateway to amazing stays.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/guest/browse" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link to="/host/login" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Become a Host
                </Link>
              </li>
              <li>
                <Link to="/guest/dashboard" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Guest Dashboard
                </Link>
              </li>
              <li>
                <Link to="/host/dashboard" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">
                  Host Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Actions */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 mb-4">
              <li>
                <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center">
                  <Lock className="w-3 h-3 mr-2" />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="mailto:hello@mojodojocasahouse.com" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center">
                  <FileText className="w-3 h-3 mr-2" />
                  Terms of Service
                </a>
              </li>
            </ul>
            <div className="flex items-center space-x-3 mt-4">
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
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-slate-500 text-xs text-center md:text-left">
              © 2024 Mojo Dojo Casa House. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
