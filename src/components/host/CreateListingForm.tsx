import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PayPalButton } from "@/components/payments/PayPalButton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useAuth } from "@/contexts/AuthContext";
import { createListing, uploadListingImages } from "@/lib/firestore";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const CreateListingForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'home' as 'home' | 'experience' | 'service',
    price: '',
    discount: '',
    promo: '',
    location: '',
    maxGuests: '',
    bedrooms: '',
    bathrooms: '',
    amenities: '',
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const SUBSCRIPTION_FEE = 10; // USD

  const generateAvailableDates = (from: Date, to: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(from);
    
    while (current <= to) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Generate available dates from date range if provided
      let finalAvailableDates = availableDates;
      if (dateRange.from && dateRange.to) {
        finalAvailableDates = generateAvailableDates(dateRange.from, dateRange.to);
      }

      const listingId = await createListing({
        hostId: user.uid,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price),
        discount: formData.discount ? Number(formData.discount) : undefined,
        promo: formData.promo || undefined,
        location: formData.location,
        maxGuests: Number(formData.maxGuests),
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
        availableDates: finalAvailableDates,
        blockedDates,
        images: [],
        status: saveAsDraft ? 'draft' : 'pending',
      });

      if (images.length > 0) {
        const imageUrls = await uploadListingImages(images, listingId);
        await createListing({ ...formData, images: imageUrls } as any);
      }

      toast.success("Listing created successfully!");
      onSuccess();
    } catch (error) {
      toast.error("Failed to create listing");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createListingAfterPayment = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let finalAvailableDates = availableDates;
      if (dateRange.from && dateRange.to) {
        finalAvailableDates = generateAvailableDates(dateRange.from, dateRange.to);
      }

      const listingId = await createListing({
        hostId: user.uid,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price),
        discount: formData.discount ? Number(formData.discount) : undefined,
        promo: formData.promo || undefined,
        location: formData.location,
        maxGuests: Number(formData.maxGuests),
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
        availableDates: finalAvailableDates,
        blockedDates,
        images: [],
        status: 'pending',
      });

      if (images.length > 0) {
        const imageUrls = await uploadListingImages(images, listingId);
        await createListing({ ...formData, images: imageUrls } as any);
      }

      toast.success("Payment received. Listing submitted for review!");
      onSuccess();
    } catch (error) {
      toast.error("Failed to create listing after payment");
      console.error(error);
    } finally {
      setLoading(false);
      setShowPayment(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!formData.title || !formData.description || !formData.price || !formData.location || !formData.maxGuests) {
      toast.error("Please complete required fields before proceeding to payment.");
      return;
    }
    setSaveAsDraft(false);
    setShowPayment(true);
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Create New Listing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Price per Night ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                placeholder="Optional discount percentage"
              />
            </div>
            <div>
              <Label htmlFor="promo">Promo Description</Label>
              <Input
                id="promo"
                value={formData.promo}
                onChange={(e) => setFormData({ ...formData, promo: e.target.value })}
                placeholder="e.g., 'Summer Special'"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="maxGuests">Max Guests</Label>
              <Input
                id="maxGuests"
                type="number"
                value={formData.maxGuests}
                onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="amenities">Amenities (comma separated)</Label>
            <Input
              id="amenities"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              placeholder="WiFi, Pool, Kitchen"
            />
          </div>

          <div>
            <Label htmlFor="dateRange">Availability Date Range</Label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select your listing availability period"
              className="mt-2"
            />
            {dateRange.from && dateRange.to && (
              <p className="text-sm text-muted-foreground mt-2">
                Available from {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="images">Images</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('images')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Images ({images.length} selected)
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={loading}
              className="flex-1"
              onClick={handleProceedToPayment}
            >
              {loading ? "Creating..." : `Pay & Publish`}
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={loading}
              className="flex-1"
              onClick={() => setSaveAsDraft(true)}
            >
              {loading ? "Saving..." : "Save as Draft"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Dialog open={showPayment} onOpenChange={setShowPayment}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Subscription to Publish</DialogTitle>
          <DialogDescription>
            Pay a one-time subscription fee to submit your listing for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Listing</div>
            <div className="font-medium">{formData.title || 'Untitled Listing'}</div>
            <div className="text-sm text-muted-foreground">Category: {formData.category}</div>
            <div className="text-sm text-muted-foreground">Location: {formData.location || '-'}</div>
            <div className="text-sm text-muted-foreground">
              {dateRange.from && dateRange.to ? `Availability: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 'Availability: Not set'}
            </div>
          </div>

          {user && (
            <PayPalButton
              amount={SUBSCRIPTION_FEE}
              userId={user.uid}
              description={`Host subscription for listing: ${formData.title || 'Untitled'}`}
              onSuccess={createListingAfterPayment}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
