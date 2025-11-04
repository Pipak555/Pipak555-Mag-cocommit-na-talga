import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Shield, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VideoBackground } from '@/components/ui/video-background';
import Logo from '@/components/shared/Logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const hostLoginVideo = '/videos/host-login-bg.mp4';

const HostPolicyAcceptance = () => {
  const navigate = useNavigate();
  const [acceptedCancellation, setAcceptedCancellation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [allAccepted, setAllAccepted] = useState(false);

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
    setAcceptedCancellation(true);
    setAcceptedTerms(true);
    setAcceptedRules(true);
    setAllAccepted(true);
  };

  const handleContinue = () => {
    if (acceptedCancellation && acceptedTerms && acceptedRules) {
      // Store acceptance in sessionStorage to pass to signup
      sessionStorage.setItem('hostPolicyAccepted', 'true');
      sessionStorage.setItem('hostPolicyAcceptedDate', new Date().toISOString());
      navigate('/host/login', { state: { showSignup: true } });
    } else {
      alert('Please accept all policies and terms to continue.');
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
          
          <CardContent className="flex-1 overflow-y-auto py-6 max-h-[60vh]">
            <Tabs defaultValue="cancellation" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="cancellation" className="text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancellation
                </TabsTrigger>
                <TabsTrigger value="terms" className="text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Terms of Service
                </TabsTrigger>
                <TabsTrigger value="rules" className="text-sm">
                  <Shield className="h-4 w-4 mr-2" />
                  House Rules
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="cancellation" className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                    {cancellationPolicy}
                  </pre>
                </div>
                <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg border">
                  <Checkbox
                    id="accept-cancellation"
                    checked={acceptedCancellation}
                    onCheckedChange={(checked) => setAcceptedCancellation(checked === true)}
                  />
                  <Label htmlFor="accept-cancellation" className="text-sm font-medium cursor-pointer flex-1">
                    I have read and agree to the Cancellation Policy
                  </Label>
                </div>
              </TabsContent>
              
              <TabsContent value="terms" className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                    {termsOfService}
                  </pre>
                </div>
                <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg border">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <Label htmlFor="accept-terms" className="text-sm font-medium cursor-pointer flex-1">
                    I have read and agree to the Terms of Service
                  </Label>
                </div>
              </TabsContent>
              
              <TabsContent value="rules" className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm font-sans text-foreground leading-relaxed">
                    {houseRules}
                  </pre>
                </div>
                <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg border">
                  <Checkbox
                    id="accept-rules"
                    checked={acceptedRules}
                    onCheckedChange={(checked) => setAcceptedRules(checked === true)}
                  />
                  <Label htmlFor="accept-rules" className="text-sm font-medium cursor-pointer flex-1">
                    I have read and agree to the House Rules & Regulations
                  </Label>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Accept All Button */}
            <div className="mt-6 pt-6 border-t">
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                className="w-full mb-4"
                disabled={allAccepted}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {allAccepted ? 'All Policies Accepted' : 'Accept All Policies'}
              </Button>
            </div>
          </CardContent>
          
          {/* Footer Actions */}
          <div className="border-t p-6 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {acceptedCancellation && acceptedTerms && acceptedRules ? (
                  <span className="text-green-600 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    All policies accepted
                  </span>
                ) : (
                  'Please accept all policies to continue'
                )}
              </p>
              <Button
                onClick={handleContinue}
                disabled={!acceptedCancellation || !acceptedTerms || !acceptedRules}
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

