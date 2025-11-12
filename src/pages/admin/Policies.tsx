import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Shield, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/BackButton";

const Policies = () => {
  const navigate = useNavigate();
  const [cancellationPolicy, setCancellationPolicy] = useState(`CANCELLATION POLICY

1. GUEST CANCELLATION POLICY:
   
   Flexible Cancellation (48+ hours before check-in):
   - Full refund of all fees paid
   - No cancellation charges
   - Instant refund processing (3-5 business days)
   
   Moderate Cancellation (24-48 hours before check-in):
   - 50% refund of the total booking amount
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
   - Hosts will be notified of any cancellation-related actions`);

  const [termsOfService, setTermsOfService] = useState(`TERMS OF SERVICE

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
   - Continued use of platform constitutes acceptance of modified terms`);

  const [houseRules, setHouseRules] = useState(`HOUSE RULES & REGULATIONS

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
   - Both parties must comply with platform decisions`);

  const handleSave = () => {
    // In a real app, save to Firestore
    toast.success("Policies updated successfully");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton to="/admin/dashboard" className="mb-6" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Policies & Compliance</h1>
            <p className="text-muted-foreground">
              Manage platform rules, regulations, and policies
            </p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save All Changes
          </Button>
        </div>

        <Tabs defaultValue="cancellation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="rules">House Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="cancellation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Cancellation Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  rows={25}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={termsOfService}
                  onChange={(e) => setTermsOfService(e.target.value)}
                  rows={30}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  House Rules & Regulations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  rows={35}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Policies;
