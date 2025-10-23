import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Shield, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const Policies = () => {
  const navigate = useNavigate();
  const [cancellationPolicy, setCancellationPolicy] = useState(`
CANCELLATION POLICY

1. Free Cancellation: 
   - Full refund if cancelled 48+ hours before check-in
   - 50% refund if cancelled 24-48 hours before check-in
   - No refund if cancelled less than 24 hours before check-in

2. Host Cancellation:
   - Hosts may cancel up to 7 days before check-in without penalty
   - Last-minute host cancellations result in automatic full refund to guest
  `);

  const [termsOfService, setTermsOfService] = useState(`
TERMS OF SERVICE

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
  `);

  const [houseRules, setHouseRules] = useState(`
HOUSE RULES & REGULATIONS

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
  `);

  const handleSave = () => {
    // In a real app, save to Firestore
    toast.success("Policies updated successfully");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

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
                  rows={15}
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
                  rows={15}
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
                  rows={15}
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
