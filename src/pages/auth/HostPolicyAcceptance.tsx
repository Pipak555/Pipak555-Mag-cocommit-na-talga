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
  const { user, hasRole, addRole, signOut } = useAuth();
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
  // Once a section is marked as read, it stays marked (progress doesn't go backwards)
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
    // Only set to true if not already true (progress doesn't go backwards)
    if (cancellationSectionRef.current && !hasScrolledCancellation) {
      const sectionTop = cancellationSectionRef.current.offsetTop;
      const sectionHeight = cancellationSectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      if (viewportBottom >= sectionBottom - 50) {
        setHasScrolledCancellation(true);
      }
    }
    
    if (termsSectionRef.current && !hasScrolledTerms) {
      const sectionTop = termsSectionRef.current.offsetTop;
      const sectionHeight = termsSectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      if (viewportBottom >= sectionBottom - 50) {
        setHasScrolledTerms(true);
      }
    }
    
    if (rulesSectionRef.current && !hasScrolledRules) {
      const sectionTop = rulesSectionRef.current.offsetTop;
      const sectionHeight = rulesSectionRef.current.offsetHeight;
      const sectionBottom = sectionTop + sectionHeight;
      if (viewportBottom >= sectionBottom - 50) {
        setHasScrolledRules(true);
      }
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

1. GUEST CANCELLATION POLICY:
   
   Flexible Cancellation (48+ hours before check-in):
   - Full refund of all fees paid
   - No cancellation charges
   - Instant refund processing (3-5 business days)
   
   Moderate Cancellation (24-48 hours before check-in):
   - 50% refund of the total booking amount
   - Service fees are non-refundable
   - Refund processed within 5-7 business days
   
   Strict Cancellation (Less than 24 hours before check-in):
   - No refund will be provided
   - All fees are non-refundable
   - Booking is considered final

2. HOST CANCELLATION POLICY:
   
   Standard Cancellation Window:
   - Hosts may cancel bookings up to 7 days before check-in without penalty
   - Hosts must provide a valid reason for cancellation
   - Platform will automatically notify affected guests
   
   Last-Minute Host Cancellations (Less than 7 days):
   - Automatic full refund to guest (including all fees)
   - Host account may be temporarily suspended
   - Review of host account status required
   - Potential removal from platform for repeated violations
   
   Repeated Cancellation Policy:
   - First cancellation: Warning notification
   - Second cancellation within 6 months: 7-day account suspension
   - Third cancellation within 6 months: 30-day account suspension
   - Fourth cancellation within 6 months: Permanent account removal

3. EMERGENCY CANCELLATIONS:
   
   Extenuating Circumstances:
   - Natural disasters, government travel restrictions, or medical emergencies
   - Must provide documentation within 48 hours
   - Full refund may be granted at platform's discretion
   - Case-by-case review process

4. REFUND PROCESSING:
   - All refunds processed to original payment method
   - Processing time: 3-10 business days depending on payment provider
   - Guests will receive email confirmation upon refund initiation
   - Hosts will be notified of any cancellation-related actions`;

  const termsOfService = `TERMS OF SERVICE

1. USER ELIGIBILITY AND ACCOUNT REQUIREMENTS:
   
   Age Requirement:
   - All users must be at least 18 years of age
   - Users under 18 must have parental consent and supervision
   - False age representation will result in immediate account termination
   
   Account Information:
   - Provide accurate, current, and complete information
   - Maintain and promptly update account information
   - You are responsible for maintaining account security
   - Notify us immediately of any unauthorized account access
   
   Account Responsibilities:
   - One account per person (no duplicate accounts)
   - Account sharing is strictly prohibited
   - You are responsible for all activities under your account

2. HOST OBLIGATIONS AND RESPONSIBILITIES:
   
   Property Listings:
   - All property descriptions must be accurate and truthful
   - Photos must represent the actual property condition
   - Disclose any known issues, restrictions, or limitations
   - Update availability calendar in real-time
   - Maintain property in safe, clean, and habitable condition
   
   Booking Management:
   - Honor all confirmed bookings without exception
   - Provide clear and accurate check-in instructions
   - Respond to guest inquiries within 24 hours
   - Be available or provide emergency contact during guest stays
   - Ensure property meets all local safety and health regulations
   
   Pricing and Fees:
   - Set fair and competitive pricing
   - All fees must be clearly disclosed in listing
   - No hidden charges or surprise fees allowed
   - Platform service fees are non-negotiable

3. GUEST OBLIGATIONS AND RESPONSIBILITIES:
   
   Booking Requirements:
   - Provide accurate guest count and information
   - Respect maximum occupancy limits
   - Follow all house rules and property guidelines
   - Treat property with care and respect
   
   Payment Obligations:
   - Pay all fees in full and on time
   - Understand cancellation policies before booking
   - Payment disputes must be reported within 48 hours
   
   Property Care:
   - Report any damages immediately to host
   - Leave property in same condition as received
   - Follow check-out procedures as specified

4. PLATFORM USAGE RULES:
   
   Prohibited Activities:
   - No illegal activities of any kind
   - No discrimination based on race, religion, gender, sexual orientation, or disability
   - No harassment, abuse, or threatening behavior
   - No fraudulent transactions or chargebacks
   - No circumventing platform fees or direct booking arrangements
   - No spam, phishing, or malicious content
   
   Content Guidelines:
   - No false, misleading, or defamatory content
   - No copyrighted material without permission
   - No inappropriate, offensive, or illegal content
   - Respect intellectual property rights

5. LIABILITY AND DISCLAIMERS:
   
   Platform Role:
   - We act as an intermediary connecting hosts and guests
   - We are not responsible for property conditions or guest experiences
   - We do not guarantee property availability or accuracy
   - We are not liable for disputes between hosts and guests
   
   User Responsibility:
   - Users are solely responsible for their own safety
   - Users assume all risks associated with property use
   - Platform is not liable for personal injury or property damage
   - Users must comply with all local laws and regulations
   
   Insurance:
   - Hosts are strongly encouraged to maintain property insurance
   - Guests are encouraged to obtain travel insurance
   - Platform provides limited protection but is not a substitute for insurance

6. PAYMENT PROCESSING:
   
   Payment Methods:
   - We accept various payment methods as displayed
   - All payments are processed securely through third-party providers
   - Platform holds payments until check-in confirmation
   
   Refunds and Disputes:
   - Refunds processed according to cancellation policy
   - Disputes must be reported within 48 hours of check-in
   - Platform reserves right to mediate disputes
   - Final decisions on disputes are at platform's discretion

7. TERMINATION AND SUSPENSION:
   
   Account Termination:
   - We reserve the right to suspend or terminate accounts for policy violations
   - Repeated violations may result in permanent ban
   - No refunds for terminated accounts
   - Users may appeal termination decisions

8. MODIFICATIONS TO TERMS:
   - We reserve the right to modify these terms at any time
   - Users will be notified of significant changes
   - Continued use of platform constitutes acceptance of modified terms`;

  const houseRules = `HOUSE RULES & REGULATIONS

1. GUEST CONDUCT AND BEHAVIOR:
   
   Noise and Disturbance:
   - Respect quiet hours (typically 10 PM - 8 AM, unless otherwise specified)
   - Keep noise levels reasonable at all times
   - No loud music, parties, or disruptive activities
   - Be considerate of neighbors and surrounding community
   - Excessive noise complaints may result in immediate eviction without refund
   
   Smoking Policy:
   - No smoking inside the property unless explicitly stated in listing
   - If smoking is allowed, use designated outdoor areas only
   - Dispose of cigarette butts properly
   - Violation of smoking policy may result in additional cleaning fees ($200+)
   
   Occupancy Limits:
   - Maximum guest count must be strictly respected
   - No unregistered guests or visitors without host approval
   - Additional guests may result in extra charges or eviction
   - Host must be notified of any changes to guest count
   
   Parties and Events:
   - No parties, events, or gatherings without explicit written host permission
   - Small gatherings may be allowed with prior approval
   - Violation of this rule may result in immediate eviction and $500+ fine
   - Security deposits may be forfeited for party-related damages

2. PROPERTY CARE AND MAINTENANCE:
   
   Damage Reporting:
   - Report any damages, malfunctions, or issues immediately to host
   - Take photos of any existing damage upon arrival
   - Failure to report damages may result in charges
   - Accidental damage should be reported within 24 hours
   
   Cleanliness Standards:
   - Keep property clean and tidy during stay
   - Clean up after yourself in common areas
   - Wash dishes and clean kitchen after use
   - Excessive mess may result in additional cleaning fees
   
   Waste Management:
   - Dispose of trash in designated bins
   - Follow local recycling guidelines
   - Do not leave trash outside property
   - Large items must be disposed of properly (contact host)
   
   Check-Out Procedures:
   - Check-out time must be strictly adhered to (typically 11 AM)
   - Remove all personal belongings
   - Return keys/access codes as instructed
   - Leave property in reasonable condition
   - Late check-out may result in additional charges

3. SECURITY AND SAFETY:
   
   Access and Entry:
   - Lock all doors and windows when leaving property
   - Do not share access codes, keys, or entry information with unauthorized persons
   - Report lost keys or compromised access immediately
   - Unauthorized access sharing may result in account termination
   
   Security Measures:
   - Do not tamper with security systems or cameras
   - Report any suspicious activity to host and local authorities
   - Keep emergency contact information accessible
   - Follow all safety instructions provided by host
   
   Emergency Procedures:
   - Familiarize yourself with emergency exits and procedures
   - Know location of fire extinguishers and first aid kits
   - Contact emergency services (911) for life-threatening situations
   - Notify host of any emergencies immediately

4. HOST RESPONSIBILITIES AND OBLIGATIONS:
   
   Property Standards:
   - Ensure property meets all local safety and health codes
   - Maintain property in clean, safe, and habitable condition
   - Provide working smoke detectors, carbon monoxide detectors, and fire extinguishers
   - Address any safety hazards immediately
   
   Information and Communication:
   - Provide accurate and detailed property descriptions
   - Maintain up-to-date availability calendar
   - Provide clear check-in instructions at least 24 hours before arrival
   - Respond to guest inquiries within 24 hours
   - Be available or provide emergency contact during guest stays
   
   Guest Support:
   - Address guest concerns and issues promptly
   - Provide necessary amenities as listed
   - Ensure property matches listing description
   - Handle maintenance issues in a timely manner
   - Provide local recommendations and assistance when requested

5. PROHIBITED ITEMS AND ACTIVITIES:
   
   Illegal Activities:
   - No illegal drugs or substances
   - No illegal activities of any kind
   - No weapons or dangerous items
   - Violation may result in immediate eviction and law enforcement notification
   
   Property Modifications:
   - No alterations to property without written permission
   - No moving furniture or fixtures
   - No painting, drilling, or permanent changes
   - No removal of property items
   
   Pets:
   - Pets only allowed if explicitly stated in listing
   - Service animals are always welcome (documentation may be required)
   - Pet fees and rules apply as specified
   - Unauthorized pets may result in immediate eviction and fees

6. ADDITIONAL FEES AND CHARGES:
   
   Violation Fees:
   - Smoking violation: $200+ cleaning fee
   - Unauthorized party: $500+ fine + potential eviction
   - Excessive cleaning required: $100-300 cleaning fee
   - Late check-out: $50 per hour
   - Lost keys/access: $100 replacement fee
   
   Damage Charges:
   - Guests are responsible for all damages caused during stay
   - Security deposit may be used to cover damages
   - Additional charges may apply for damages exceeding deposit
   - All charges will be clearly itemized and communicated

7. DISPUTE RESOLUTION:
   
   Communication:
   - All issues should first be addressed directly with host/guest
   - Document all communications and issues
   - Platform mediation available for unresolved disputes
   
   Resolution Process:
   - Report disputes within 48 hours of incident
   - Provide evidence (photos, messages, etc.)
   - Platform will review and make final determination
   - Both parties must comply with platform decisions`;

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
    
    // If user is an admin, sign them out first so they can create a new account
    if (user && hasRole('admin')) {
      try {
        await signOut();
        toast.info('Please sign up with a different account to become a host.');
        // Save policies acceptance for after signup
        sessionStorage.setItem('hostPolicyAccepted', 'true');
        sessionStorage.setItem('hostPolicyAcceptedDate', policyAcceptedDate);
        navigate('/host/login', { state: { showSignup: true } });
        return;
      } catch (error: any) {
        toast.error('Failed to sign out. Please sign out manually and try again.');
        return;
      }
    }
    
    // If user is already signed in and doesn't have host role (and is not admin), add it directly
    if (user && !hasRole('host') && !hasRole('admin')) {
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
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-md max-h-[95vh] overflow-hidden flex flex-col">
          <CardHeader className="space-y-2 text-center pb-3 border-b">
            <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Host Policies & Compliance</CardTitle>
              <CardDescription className="text-sm mt-1">
                Please read and accept all policies before creating your host account
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col py-3 overflow-hidden min-h-0">
            {/* Progress Bar */}
            <div className="mb-3 space-y-1.5">
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
              className="flex-1 overflow-y-auto pr-3 min-h-0"
            >
              <div className="space-y-6 pb-3">
                {/* Cancellation Policy Section */}
                <div ref={cancellationSectionRef} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold">Cancellation Policy</h3>
                      <p className="text-xs text-muted-foreground">Read and understand our cancellation terms</p>
                    </div>
                    {hasScrolledCancellation && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                      {cancellationPolicy}
                    </pre>
                  </div>
                  
                  <div className="flex items-start space-x-2 p-3 bg-muted/30 rounded-lg border">
                    <Checkbox
                      id="accept-cancellation"
                      checked={acceptedCancellation}
                      disabled={false}
                      onCheckedChange={(checked) => setAcceptedCancellation(checked === true)}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor="accept-cancellation" 
                      className="text-xs font-medium flex-1 cursor-pointer"
                    >
                      I have read and agree to the Cancellation Policy
                    </Label>
                  </div>
                </div>
                
                {/* Terms of Service Section */}
                <div ref={termsSectionRef} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold">Terms of Service</h3>
                      <p className="text-xs text-muted-foreground">Platform usage and responsibilities</p>
                    </div>
                    {hasScrolledTerms && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                      {termsOfService}
                    </pre>
                  </div>
                  
                  <div className="flex items-start space-x-2 p-3 bg-muted/30 rounded-lg border">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      disabled={false}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor="accept-terms" 
                      className="text-xs font-medium flex-1 cursor-pointer"
                    >
                      I have read and agree to the Terms of Service
                    </Label>
                  </div>
                </div>
                
                {/* House Rules Section */}
                <div ref={rulesSectionRef} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold">House Rules & Regulations</h3>
                      <p className="text-xs text-muted-foreground">Property rules and guest conduct</p>
                    </div>
                    {hasScrolledRules && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                      {houseRules}
                    </pre>
                  </div>
                  
                  <div className="flex items-start space-x-2 p-3 bg-muted/30 rounded-lg border">
                    <Checkbox
                      id="accept-rules"
                      checked={acceptedRules}
                      disabled={false}
                      onCheckedChange={(checked) => setAcceptedRules(checked === true)}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor="accept-rules" 
                      className="text-xs font-medium flex-1 cursor-pointer"
                    >
                      I have read and agree to the House Rules & Regulations
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Accept All Button */}
            <div className="mt-3 pt-3 border-t">
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                className="w-full"
                disabled={allAccepted}
                size="sm"
              >
                <CheckCircle2 className="h-3 w-3 mr-2" />
                {allAccepted ? 'All Policies Accepted ✓' : 'Accept All Policies'}
              </Button>
              {!allAccepted && (
                <p className="text-xs text-muted-foreground text-center mt-1.5">
                  Scroll to the end of all policies, then click "Accept All Policies"
                </p>
              )}
            </div>
          </CardContent>
          
          {/* Footer Actions */}
          <div className="border-t p-4 bg-muted/30">
            {user && hasRole('admin') && (
              <div className="mb-4 p-4 bg-orange-100 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-800 rounded-xl shadow-md">
                <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <strong>Admin Account Detected:</strong> You'll be signed out to create a host account with a different email.
                </p>
              </div>
            )}
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

