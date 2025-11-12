import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import LoadingScreen from "@/components/ui/loading-screen";
import AdminPayPalIdentity from "@/components/payments/AdminPayPalIdentity";

interface AdminPayPalSettings {
  paypalEmail?: string;
  updatedAt?: string;
}

const AdminPayPalSettings = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AdminPayPalSettings>({});
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paypalVerified, setPaypalVerified] = useState(false);
  const [needsEmailInput, setNeedsEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadSettings();
  }, [user, userRole, navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Load from admin settings document or user document
      const adminSettingsDoc = await getDoc(doc(db, 'adminSettings', 'paypal'));
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let adminSettings: AdminPayPalSettings = {};
      
      if (adminSettingsDoc.exists()) {
        adminSettings = adminSettingsDoc.data() as AdminPayPalSettings;
      } else if (userDoc.exists()) {
        const userData = userDoc.data();
        // Only use admin PayPal fields, NOT guest PayPal fields
        if (userData.adminPayPalEmail) {
          adminSettings = {
            paypalEmail: userData.adminPayPalEmail,
          };
        }
      }

      setSettings(adminSettings);
      setPaypalEmail(adminSettings.paypalEmail || '');
      
      // Check if admin PayPal is verified (ONLY check admin fields, not guest fields)
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPaypalVerified(!!userData.adminPayPalEmailVerified);
        // Make sure we're using admin PayPal email, not guest PayPal email
        if (userData.adminPayPalEmail && !adminSettings.paypalEmail) {
          setPaypalEmail(userData.adminPayPalEmail);
          setSettings({ paypalEmail: userData.adminPayPalEmail });
        }
      }
    } catch (error: any) {
      console.error('Error loading PayPal settings:', error);
      toast.error('Failed to load PayPal settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalVerified = useCallback(async (email: string) => {
    if (!user) return;
    
    // If email is empty, it means OAuth succeeded but email wasn't extracted
    // Show input field for admin to enter their business PayPal email
    if (!email || email === '') {
      setNeedsEmailInput(true);
      return;
    }
    
    try {
      const updatedSettings: AdminPayPalSettings = {
        paypalEmail: email,
        updatedAt: new Date().toISOString(),
      };

      // Save to adminSettings collection
      await setDoc(doc(db, 'adminSettings', 'paypal'), updatedSettings, { merge: true });

      // Also save to admin user document for easy access
      await updateDoc(doc(db, 'users', user.uid), {
        adminPayPalEmail: email,
        adminPayPalEmailVerified: true,
      });

      setSettings(updatedSettings);
      setPaypalEmail(email);
      setPaypalVerified(true);
      setNeedsEmailInput(false);
      toast.success('PayPal account linked successfully! All payments will go to this account.');
    } catch (error: any) {
      console.error('Error saving PayPal settings:', error);
      toast.error('Failed to save PayPal settings');
    }
  }, [user]);

  const handleSaveEmail = async () => {
    if (!user) return;
    
    if (!emailInput.trim()) {
      toast.error('Please enter your PayPal business email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const email = emailInput.trim();
      const updatedSettings: AdminPayPalSettings = {
        paypalEmail: email,
        updatedAt: new Date().toISOString(),
      };

      // Save to adminSettings collection
      await setDoc(doc(db, 'adminSettings', 'paypal'), updatedSettings, { merge: true });

      // Also save to admin user document
      await updateDoc(doc(db, 'users', user.uid), {
        adminPayPalEmail: email,
        adminPayPalEmailVerified: true,
      });

      setSettings(updatedSettings);
      setPaypalEmail(email);
      setPaypalVerified(true);
      setNeedsEmailInput(false);
      setEmailInput('');
      toast.success('PayPal account linked! All payments will go to this account.');
    } catch (error: any) {
      console.error('Error saving PayPal email:', error);
      toast.error('Failed to save PayPal email');
    }
  };

  const handleUnlinkPayPal = async () => {
    if (!user) return;

    try {
      // Clear from adminSettings
      await setDoc(doc(db, 'adminSettings', 'paypal'), {
        paypalEmail: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Clear from user document
      await updateDoc(doc(db, 'users', user.uid), {
        adminPayPalEmail: null,
        adminPayPalEmailVerified: false,
      });

      setPaypalEmail('');
      setPaypalVerified(false);
      setSettings({});
      toast.success("PayPal account unlinked");
    } catch (error) {
      console.error('Error unlinking PayPal:', error);
      toast.error("Failed to unlink PayPal account");
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation self-start">
            <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2" />
            Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Admin PayPal Account</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Configure the PayPal account that will receive all platform revenue</p>
          </div>
        </div>

        {/* PayPal Account Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Platform Payment Account
            </CardTitle>
            <CardDescription>
              Link the PayPal account that will receive all platform revenue including subscription payments and service fees. You can link any PayPal account (business or personal).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <>
                <AdminPayPalIdentity
                  userId={user.uid}
                  onVerified={handlePayPalVerified}
                  paypalEmail={paypalEmail}
                  paypalVerified={paypalVerified}
                />
                
                {/* Show email input if OAuth verified but email not set */}
                {needsEmailInput && !paypalEmail && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                            Complete Account Setup
                          </p>
                          <p className="text-xs text-yellow-800 dark:text-yellow-200">
                            Your PayPal account has been verified. Enter the email address of the PayPal account you just logged into. This account will receive all platform revenue (subscriptions + service fees).
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="paypal-email">
                        PayPal Account Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="paypal-email"
                        type="email"
                        placeholder="your-paypal@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="max-w-md"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the email address of the PayPal account you just logged into
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEmail} size="sm">
                        Save Email
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setNeedsEmailInput(false);
                          setEmailInput('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {paypalVerified && paypalEmail && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1">Platform Payment Account</p>
                        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-1">
                          {paypalEmail}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Receiving: Subscription payments • Service fees (10% commission)
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleUnlinkPayPal}>
                        Unlink Account
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Please sign in as admin to link your PayPal account
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPayPalSettings;

