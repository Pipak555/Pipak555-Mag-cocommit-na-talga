import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Shield, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VideoBackground } from '@/components/ui/video-background';
import Logo from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const hostLoginVideo = '/videos/landing-hero.mp4';

const HostPolicyAcceptance = () => {
  const navigate = useNavigate();
  const { user, hasRole, addRole } = useAuth();
  const [acceptedCancellation, setAcceptedCancellation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  
  // Calculate allAccepted based on all checkboxes
  const allAccepted = acceptedCancellation && acceptedTerms && acceptedRules;
  
  // Track scroll state for each section
  const [hasScrolledCancellation, setHasScrolledCancellation] = useState(false);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [hasScrolledRules, setHasScrolledRules] = useState(false);
  
  // Refs for section markers
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cancellationSectionRef = useRef<HTMLDivElement>(null);
  const termsSectionRef = useRef<HTMLDivElement>(null);
  const rulesSectionRef = useRef<HTMLDivElement>(null);
  
  // Function to check if user has scrolled past a section
  const checkScrollPositions = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    const viewportBottom = scrollTop + containerHeight;
    
    // Check if user has scrolled to the very bottom (within 100px threshold)
    const isAtBottom = scrollTop + containerHeight >= scrollHeight - 100;
    
    // If user has scrolled to bottom, mark all sections as read
    if (isAtBottom) {
      setHasScrolledCancellation(true);
      setHasScrolledTerms(true);
      setHasScrolledRules(true);
      return;
    }
    
    // Otherwise, check each section individually
    if (cancellationSectionRef.current) {
      const sectionTop = cancellationSectionRef.current.offsetTop;
      const sectionHeight = cancellationSectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      setHasScrolledCancellation(viewportBottom >= sectionBottom - 50);
    }
    
    if (termsSectionRef.current) {
      const sectionTop = termsSectionRef.current.offsetTop;
      const sectionHeight = termsSectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      setHasScrolledTerms(viewportBottom >= sectionBottom - 50);
    }
    
    if (rulesSectionRef.current) {
      const sectionTop = rulesSectionRef.current.offsetTop;
      const sectionHeight = rulesSectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      setHasScrolledRules(viewportBottom >= sectionBottom - 50);
    }
  };
  
  // Set up scroll listener for the main container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      checkScrollPositions();
    };
    
    container.addEventListener('scroll', handleScroll);
    // Check initial state
    checkScrollPositions();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Default policies (in production, these should be fetched from Firestore)
  const cancellationPolicy = `CANCELLATION POLICY

1. Free Cancellation: 
   - Full refund if cancelled 48+ hours before check-in
   - 50% refund if cancelled 24-48 hours before check-in
   - No refund if cancelled less than 24 hours before check-in

2. Host Cancellation:
   - Hosts may cancel up to 7 days before check-in without penalty
   - Last-minute host cancellations result in automatic full refund to guest
   - Repeated cancellations may result in account suspension`;

  const termsOfService = `TERMS OF SERVICE

1. User Responsibilities:
   - Users must be 18+ years old
   - Accurate information must be provided
   - Properties must match their descriptions
   - Respect other users and properties

2. Platform Usage:
   - No illegal activities
   - No discrimination
   - Respect booking agreements
   - Pay all applicable fees

3. Liability:
   - Platform acts as intermediary only
   - Users responsible for their own safety
   - Insurance recommended for all parties

4. Host Obligations:
   - Maintain accurate property listings
   - Honor confirmed bookings
   - Provide safe and clean accommodations
   - Respond to guest inquiries promptly`;

  const houseRules = `HOUSE RULES & REGULATIONS

1. Guest Conduct:
   - Respect noise limitations
   - No smoking unless explicitly allowed
   - Maximum guest count must be respected
   - No parties without host permission

2. Property Care:
   - Report any damages immediately
   - Keep property clean and tidy
   - Dispose of trash properly
   - Follow check-out procedures

3. Security:
   - Lock all doors and windows
   - Don't share access codes
   - Report suspicious activity

4. Host Responsibilities:
   - Ensure property meets safety standards
   - Maintain accurate availability calendar
   - Provide clear check-in instructions
   - Address guest concerns promptly`;

  const handleAcceptAll = () => {
    // Check if user has scrolled to the end
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    const isAtBottom = scrollTop + containerHeight >= scrollHeight - 100;
    
    // If user has scrolled to the end, automatically accept all
    if (isAtBottom || (hasScrolledCancellation && hasScrolledTerms && hasScrolledRules)) {
      setAcceptedCancellation(true);
      setAcceptedTerms(true);
      setAcceptedRules(true);
      toast.success('All policies accepted!');
    } else {
      toast.error('Please scroll to the end of all policies first.');
      // Scroll to bottom
      container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  };

  const handleContinue = async () => {
    if (!allAccepted) {
      toast.error('Please accept all policies and terms to continue.');
      return;
    }
    
    const policyAcceptedDate = new Date().toISOString();
    
    // If user is already signed in and doesn't have host role, add it directly
    if (user && !hasRole('host')) {
      try {
        await addRole('host', {
          policyAccepted: true,
          policyAcceptedDate
        });
        toast.success('Welcome! You can now host properties. Redirecting to host dashboard...');
        setTimeout(() => {
          navigate('/host/dashboard');
        }, 1500);
        return;
      } catch (error: any) {
        toast.error(error.message || 'Failed to add host role. Please try again.');
        return;
      }
    }
    
    // If user is not signed in or already has host role, proceed to signup/login
    sessionStorage.setItem('hostPolicyAccepted', 'true');
    sessionStorage.setItem('hostPolicyAcceptedDate', policyAcceptedDate);
    
    if (user && hasRole('host')) {
      // Already a host, just go to dashboard
      navigate('/host/dashboard');
    } else {
      // Not signed in or new user, go to login/signup
      navigate('/host/login', { state: { showSignup: true } });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Video Background */}
      <VideoBackground 
        src={hostLoginVideo} 
        overlay={true}
        className="z-0"
      />
      
      {/* Header */}
      <header className="relative z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      {/* Policy Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-4xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-md max-h-[90vh] overflow-hidden flex flex-col">
          <CardHeader className="space-y-4 text-center pb-6 border-b">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Host Policies & Compliance</CardTitle>
              <CardDescription className="text-base mt-2">
                Please read and accept all policies before creating your host account
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col py-6 overflow-hidden">
            {/* Progress Bar */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reading Progress:</span>
                <span className="font-medium">
                  {[hasScrolledCancellation, hasScrolledTerms, hasScrolledRules].filter(Boolean).length} / 3 sections read
                </span>
              </div>
              <Progress 
                value={([hasScrolledCancellation, hasScrolledTerms, hasScrolledRules].filter(Boolean).length / 3) * 100} 
                className="h-2"
              />
            </div>
            
            {/* Scrollable Content Area */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto pr-4"
            >
              <div className="space-y-8 pb-4">
                {/* Cancellation Policy Section */}
                <div ref={cancellationSectionRef} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Cancellation Policy</h3>
                      <p className="text-sm text-muted-foreground">Read and understand our cancellation terms</p>
                    </div>
                    {hasScrolledCancellation && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 ml-auto" />
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-6 border">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                      {cancellationPolicy}
                    </pre>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
                    <Checkbox
                      id="accept-cancellation"
                      checked={acceptedCancellation}
                      disabled={false}
                      onCheckedChange={(checked) => setAcceptedCancellation(checked === true)}
                      className="mt-1"
                    />
                    <Label 
                      htmlFor="accept-cancellation" 
                      className="text-sm font-medium flex-1 cursor-pointer"
                    >
                      I have read and agree to the Cancellation Policy
                    </Label>
                  </div>
                </div>
                
                {/* Terms of Service Section */}
                <div ref={termsSectionRef} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Terms of Service</h3>
                      <p className="text-sm text-muted-foreground">Platform usage and responsibilities</p>
                    </div>
                    {hasScrolledTerms && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 ml-auto" />
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-6 border">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                      {termsOfService}
                    </pre>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      disabled={false}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-1"
                    />
                    <Label 
                      htmlFor="accept-terms" 
                      className="text-sm font-medium flex-1 cursor-pointer"
                    >
                      I have read and agree to the Terms of Service
                    </Label>
                  </div>
                </div>
                
                {/* House Rules Section */}
                <div ref={rulesSectionRef} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">House Rules & Regulations</h3>
                      <p className="text-sm text-muted-foreground">Property rules and guest conduct</p>
                    </div>
                    {hasScrolledRules && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 ml-auto" />
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-6 border">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                      {houseRules}
                    </pre>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
                    <Checkbox
                      id="accept-rules"
                      checked={acceptedRules}
                      disabled={false}
                      onCheckedChange={(checked) => setAcceptedRules(checked === true)}
                      className="mt-1"
                    />
                    <Label 
                      htmlFor="accept-rules" 
                      className="text-sm font-medium flex-1 cursor-pointer"
                    >
                      I have read and agree to the House Rules & Regulations
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Accept All Button */}
            <div className="mt-6 pt-6 border-t">
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                className="w-full"
                disabled={allAccepted}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {allAccepted ? 'All Policies Accepted ✓' : 'Accept All Policies'}
              </Button>
              {!allAccepted && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Scroll to the end of all policies, then click "Accept All Policies"
                </p>
              )}
            </div>
          </CardContent>
          
          {/* Footer Actions */}
          <div className="border-t p-6 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {allAccepted ? (
                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    All policies accepted
                  </span>
                ) : (
                  'Please accept all policies to continue'
                )}
              </p>
              <Button
                onClick={handleContinue}
                disabled={!allAccepted}
                className="min-w-[150px]"
                size="lg"
              >
                Continue to Registration
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HostPolicyAcceptance;

