import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
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
        availableDates,
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

  return (
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
              type="submit"
              disabled={loading}
              className="flex-1"
              onClick={() => setSaveAsDraft(false)}
            >
              {loading ? "Creating..." : "Publish Listing"}
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
  );
};
