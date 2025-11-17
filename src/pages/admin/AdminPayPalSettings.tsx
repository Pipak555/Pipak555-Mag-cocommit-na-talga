import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, setDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import LoadingScreen from "@/components/ui/loading-screen";
import UnifiedPayPalLinker from "@/components/payments/UnifiedPayPalLinker";
import { getPayPalLink, getPayPalLinkPath } from "@/lib/paypalLinks";
import type { PayPalLinkInfo } from "@/types";

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
  const [paypalLink, setPaypalLink] = useState<PayPalLinkInfo | null>(null);

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
      // Check both adminPayPalEmailVerified and adminPayPalOAuthVerified (same as guests)
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const link = getPayPalLink(userData as any, 'admin');
        setPaypalLink(link);
        if (link?.email && !adminSettings.paypalEmail) {
          setPaypalEmail(link.email);
          setSettings({ paypalEmail: link.email });
        }
      } else {
        setPaypalLink(null);
      }
    } catch (error: any) {
      console.error('Error loading PayPal settings:', error);
      toast.error('Failed to load PayPal settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalVerified = useCallback(async () => {
    if (!user) return;
    
    // Email is automatically set by PayPalIdentity component (same as guests)
    // Just reload settings to reflect the changes
    await loadSettings();
  }, [user]);


  const handleUnlinkPayPal = async () => {
    if (!user) return;

    try {
      // Clear from adminSettings
      await setDoc(doc(db, 'adminSettings', 'paypal'), {
        paypalEmail: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Clear from user document - both new unified structure and legacy fields
      const updateData: Record<string, unknown> = {
        // Clear new unified structure (use deleteField to actually remove the field)
        [getPayPalLinkPath('admin')]: deleteField(),
        // Clear legacy fields
        adminPayPalEmail: null,
        adminPayPalEmailVerified: false,
        adminPayPalOAuthVerified: false,
      };

      await updateDoc(doc(db, 'users', user.uid), updateData);

      // Reload settings to reflect the changes
      await loadSettings();
      
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
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')} className="h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation self-start hover:bg-role-admin/10 hover:text-role-admin">
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
                <UnifiedPayPalLinker
                  userId={user.uid}
                  role="admin"
                  linkedInfo={paypalLink ?? undefined}
                  onLinked={handlePayPalVerified}
                  onUnlink={handleUnlinkPayPal}
                  unlinkMessage="Unlinking will disable all payouts until you connect a new admin PayPal account."
                />
                
                {paypalLink?.email && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1">Platform Payment Account</p>
                        <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-1">
                          {paypalLink.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          This account will be used as the source of funds for all withdrawals. All platform revenue (subscriptions + service fees) will also be received here.
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

