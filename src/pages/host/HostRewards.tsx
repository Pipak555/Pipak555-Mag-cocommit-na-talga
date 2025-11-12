import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BackButton } from "@/components/shared/BackButton";
import { HostPointsDisplay } from "@/components/rewards/HostPointsDisplay";
import { formatPHP } from "@/lib/currency";
import { toast } from "sonner";
import type { UserProfile } from "@/types";
import LoadingScreen from "@/components/ui/loading-screen";

const HostRewards = () => {
  const navigate = useNavigate();
  const { user, userRole, refreshUserProfile, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !hasRole('host')) {
      navigate('/host/login');
      return;
    }
    if (user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user, userRole, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 max-w-4xl">
        <BackButton to="/host/dashboard" label="Back to Dashboard" className="mb-4 sm:mb-6" />

        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">Rewards</h1>

        <HostPointsDisplay 
          points={profile?.hostPoints || 0}
          userId={user?.uid || ''}
          onRedeem={(discountAmount) => {
            // Refresh profile to update points
            if (user) {
              loadProfile();
              refreshUserProfile();
            }
            toast.info(`You've earned ${formatPHP(discountAmount)} discount! Use it on your next subscription purchase.`);
          }}
        />
      </div>
    </div>
  );
};

export default HostRewards;

