import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";
import Footer from "@/components/shared/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <CardHeader className="space-y-6 text-center pb-8 pt-12">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-6xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                404
              </CardTitle>
              <CardDescription className="text-xl">
                Oops! Page not found
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <p className="text-sm text-muted-foreground">
                Requested path: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 text-base font-semibold" size="lg">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Return to Home
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link to="/guest/browse">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Listings
                </Link>
              </Button>
            </div>

            <div className="text-center space-y-4">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <p className="text-sm text-muted-foreground">
                Need help? <Link to="/contact" className="text-primary hover:underline">Contact our support team</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default NotFound;
