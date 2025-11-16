import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { CreateListingForm } from "@/components/host/CreateListingForm";
import { SubscriptionGuard } from "@/components/host/SubscriptionGuard";
import { HostEmailVerificationBanner } from "@/components/host/EmailVerificationBanner";
import { BackButton } from "@/components/shared/BackButton";

const CreateListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  useEffect(() => {
    // Redirect to category selection if no category is provided
    if (!category || !['home', 'service', 'experience'].includes(category)) {
      navigate('/host/create-listing');
    }
  }, [category, navigate]);

  // Don't render form if category is invalid
  if (!category || !['home', 'service', 'experience'].includes(category)) {
    return null;
  }

  return (
    <SubscriptionGuard required={true}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <BackButton to="/host/create-listing" className="mb-4" />
          
          {/* Email Verification Banner */}
          <HostEmailVerificationBanner />
          
          <CreateListingForm onSuccess={() => navigate('/host/listings')} />
        </div>
      </div>
    </SubscriptionGuard>
  );
};

export default CreateListing;
