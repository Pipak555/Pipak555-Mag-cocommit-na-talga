import { Loader2 } from "lucide-react";
import Logo from "@/components/shared/Logo";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Logo */}
        <div className="relative">
          <Logo size="lg" />
          <div className="absolute inset-0 -z-10 blur-2xl">
            <div className="h-32 w-32 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="absolute inset-0 -z-10 blur-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">Loading...</p>
          <p className="text-sm text-muted-foreground">Please wait while we prepare everything</p>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

