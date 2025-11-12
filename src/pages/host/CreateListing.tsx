import { useNavigate } from "react-router-dom";
import { CreateListingForm } from "@/components/host/CreateListingForm";
import { SubscriptionGuard } from "@/components/host/SubscriptionGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";

const CreateListing = () => {
  const navigate = useNavigate();

  return (
    <SubscriptionGuard required={true}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <BackButton to="/host/dashboard" className="mb-4" />
          
          <CreateListingForm onSuccess={() => navigate('/host/listings')} />
        </div>
      </div>
    </SubscriptionGuard>
  );
};

export default CreateListing;
