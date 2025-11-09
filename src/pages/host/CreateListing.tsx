import { useNavigate } from "react-router-dom";
import { CreateListingForm } from "@/components/host/CreateListingForm";
import { SubscriptionGuard } from "@/components/host/SubscriptionGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CreateListing = () => {
  const navigate = useNavigate();

  return (
    <SubscriptionGuard required={true}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/host/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <CreateListingForm onSuccess={() => navigate('/host/listings')} />
        </div>
      </div>
    </SubscriptionGuard>
  );
};

export default CreateListing;
