import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/shared/BackButton";
import { Home, Briefcase, Sparkles } from "lucide-react";
import { SubscriptionGuard } from "@/components/host/SubscriptionGuard";
import { HostEmailVerificationBanner } from "@/components/host/EmailVerificationBanner";

const SelectListingCategory = () => {
  const navigate = useNavigate();

  const handleCategorySelect = (category: 'home' | 'service' | 'experience') => {
    navigate(`/host/create-listing/form?category=${category}`);
  };

  return (
    <SubscriptionGuard required={true}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <BackButton to="/host/dashboard" className="mb-4" />
          
          {/* Email Verification Banner */}
          <HostEmailVerificationBanner />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create a New Listing</h1>
            <p className="text-muted-foreground">
              Choose the type of listing you want to create. Each category has its own specific fields and requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* House Category */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleCategorySelect('home')}
            >
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Home className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-center">House</CardTitle>
                <CardDescription className="text-center">
                  Rent out your property, apartment, or vacation home
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Price per night</li>
                  <li>• Bedrooms & bathrooms</li>
                  <li>• Guest capacity</li>
                  <li>• House type & amenities</li>
                  <li>• Location & availability</li>
                </ul>
                <Button 
                  className="w-full" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategorySelect('home');
                  }}
                >
                  Create House Listing
                </Button>
              </CardContent>
            </Card>

            {/* Service Category */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleCategorySelect('service')}
            >
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full">
                    <Briefcase className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-center">Service</CardTitle>
                <CardDescription className="text-center">
                  Offer professional services like cleaning, repairs, or consultations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Service price</li>
                  <li>• Duration & type</li>
                  <li>• Requirements</li>
                  <li>• Location (if needed)</li>
                  <li>• Service details</li>
                </ul>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategorySelect('service');
                  }}
                >
                  Create Service Listing
                </Button>
              </CardContent>
            </Card>

            {/* Experience Category */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
              onClick={() => handleCategorySelect('experience')}
            >
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <Sparkles className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-center">Experience</CardTitle>
                <CardDescription className="text-center">
                  Host unique experiences, tours, workshops, or activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>• Price per person</li>
                  <li>• Capacity & schedule</li>
                  <li>• Duration</li>
                  <li>• What's included</li>
                  <li>• Location & timing</li>
                </ul>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategorySelect('experience');
                  }}
                >
                  Create Experience Listing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
};

export default SelectListingCategory;

