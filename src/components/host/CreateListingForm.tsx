import { useCallback, useEffect, useRef, useState } from "react";
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

// Firebase imports used for draft handling
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const CreateListingForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "home" as "home" | "experience" | "service",
    price: "",
    discount: "",
    promo: "",
    location: "",
    maxGuests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: "",
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [draftFound, setDraftFound] = useState(false); // whether a draft exists on mount
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null); // will be `${uid}_draft`
  const SUBSCRIPTION_FEE = 10; // USD

  // debounce timer ref
  const saveTimeoutRef = useRef<number | null>(null);
  // track whether we have unsaved changes (prevents initial load causing save)
  const hasMountedRef = useRef(false);

  // Helper: deterministic draft doc id (one draft per user)
  const getDraftDocId = useCallback(() => {
    if (!user) return null;
    return `${user.uid}_draft`;
  }, [user]);

  // utility to generate list of iso date strings from range
  const generateAvailableDates = (from: Date, to: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(from);

    while (current <= to) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };
    // Helper: remove undefined values from object (Firestore doesn't allow undefined)
    const removeUndefined = (obj: any): any => {
      const cleaned: any = {};
      Object.keys(obj).forEach((key) => {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      });
      return cleaned;
    };

  // Save draft to Firestore (debounced by caller)
const saveDraftToFirestore = useCallback(
  async (opts?: { manual?: boolean }) => {
    if (!user) return;
    const id = getDraftDocId();
    if (!id) return;

    const finalAvailableDates = dateRange.from && dateRange.to ? generateAvailableDates(dateRange.from, dateRange.to) : availableDates;

    // Check if draft already exists to preserve createdAt
    let existingCreatedAt = null;
    try {
      const existing = await getDoc(doc(db, "listing", id));
      if (existing.exists()) {
        existingCreatedAt = existing.data().createdAt;
      }
    } catch (err) {
      console.error("Error checking existing draft:", err);
    }

    const payloadRaw = {
      hostId: user.uid,
      title: formData.title || "",
      description: formData.description || "",
      category: formData.category || "home",
      price: formData.price ? Number(formData.price) : undefined,
      discount: formData.discount ? Number(formData.discount) : undefined,
      promo: formData.promo || undefined,
      location: formData.location || "",
      maxGuests: formData.maxGuests ? Number(formData.maxGuests) : undefined,
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
      amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()).filter(Boolean) : [],
      availableDates: finalAvailableDates,
      blockedDates,
      images: [], 
      status: "draft",
      createdAt: existingCreatedAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    // Remove undefined values before saving to Firestore
    const payload = removeUndefined(payloadRaw);

    try {
      await setDoc(doc(db, "listing", id), payload, { merge: true });
      setDraftId(id);
      console.log("Draft saved successfully with payload:", payload);
      console.log("Document ID:", id);
      if (opts?.manual) toast.success("Draft saved");
    } catch (err) {
      console.error("Failed to save draft:", err);
      if (opts?.manual) {
        toast.error("Failed to save draft");
      } else {
        toast.error("Auto-save failed. Please save manually.", { duration: 3000 });
      }
    }


  },
  [user, getDraftDocId, formData, availableDates, blockedDates, dateRange]
);

  // Debounced autosave effect: triggers on formData, dateRange, availableDates, blockedDates
  useEffect(() => {
    // skip autosave on initial mount/load sequence
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!user) return;

    // clear previous timeout
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    // set new timeout
    saveTimeoutRef.current = window.setTimeout(() => {
      saveDraftToFirestore();
    }, 2000); // autosave 2s after user stops typing

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, dateRange, availableDates, blockedDates, user]); // saveDraftToFirestore stable via useCallback

  // Also save draft when user reloads/leaves (best effort)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      // synchronous save attempt (best effort) — we can't await here
      // so we do a synchronous navigator sendBeacon or simple setDoc without awaiting isn't allowed,
      // but we'll call saveDraftToFirestore without await (fire-and-forget).
      // Note: Firestore setDoc is async; this is best-effort for beforeunload.
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        saveDraftToFirestore();
      }
      // no custom message for modern browsers
      // e.returnValue = '';
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveDraftToFirestore, user]);

  // On mount: check if a draft exists for this user; if yes, prompt via custom dialog
  useEffect(() => {
    const checkDraft = async () => {
      if (!user) return;
      const id = getDraftDocId();
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "listing", id));
        if (snap.exists()) {
          setDraftFound(true);
          setShowDraftDialog(true);
          setDraftId(id);
        }
      } catch (err: any) {
        // Silently handle permission errors - just means no draft exists or user can't read it yet
        if (err.code !== 'permission-denied') {
          console.error("Failed to check draft:", err);
        }
        // Don't show error to user - it's expected if no draft exists
      }
    };
    checkDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load the draft into form state
  const loadDraft = async () => {
    if (!draftId) return;
    try {
      const snap = await getDoc(doc(db, "listing", draftId));
      if (!snap.exists()) return;
      const data = snap.data() as any;
      // map incoming fields to form state safely
      setFormData({
        title: data.title || "",
        description: data.description || "",
        category: (data.category as typeof formData.category) || "home",
        price: data.price ? String(data.price) : "",
        discount: data.discount ? String(data.discount) : "",
        promo: data.promo || "",
        location: data.location || "",
        maxGuests: data.maxGuests ? String(data.maxGuests) : "",
        bedrooms: data.bedrooms ? String(data.bedrooms) : "",
        bathrooms: data.bathrooms ? String(data.bathrooms) : "",
        amenities: Array.isArray(data.amenities) ? data.amenities.join(", ") : (data.amenities || ""),
      });
      if (data.availableDates && Array.isArray(data.availableDates)) {
        setAvailableDates(data.availableDates);
      }
      if (data.blockedDates && Array.isArray(data.blockedDates)) {
        setBlockedDates(data.blockedDates);
      }
      // we intentionally do NOT restore "images" File objects (cannot). User must re-upload.
      setShowDraftDialog(false);
      toast.success("Draft loaded");
    } catch (err) {
      console.error("Failed to load draft:", err);
      toast.error("Failed to load draft");
    }
  };

  // Discard draft: delete doc and reset form
  const discardDraft = async () => {
    if (!draftId) {
      // nothing to delete; just reset and close dialog
      setShowDraftDialog(false);
      setDraftFound(false);
      return;
    }
    try {
      await deleteDoc(doc(db, "listing", draftId));
      setDraftId(null);
      setShowDraftDialog(false);
      setDraftFound(false);
      // reset form
      setFormData({
        title: "",
        description: "",
        category: "home",
        price: "",
        discount: "",
        promo: "",
        location: "",
        maxGuests: "",
        bedrooms: "",
        bathrooms: "",
        amenities: "",
      });
      setAvailableDates([]);
      setBlockedDates([]);
      setDateRange({ from: undefined, to: undefined });
      toast.success("Draft discarded");
    } catch (err) {
      console.error("Failed to discard draft:", err);
      toast.error("Failed to discard draft");
    }
  };

  // Helper to publish/update listing (used by both submit and payment flow)
  // If draft exists, we update that doc (change status to pending or published)
  // Otherwise create a new listing doc (using your createListing helper)
 // Around line 265-301, update persistListing:
const persistListing = async (status: "pending" | "draft") => {
  if (!user) throw new Error("No user");
  const finalAvailableDates = dateRange.from && dateRange.to ? generateAvailableDates(dateRange.from, dateRange.to) : availableDates;

  // Check existing listing to preserve createdAt
  let existingCreatedAt = null;
  if (draftId) {
    try {
      const existing = await getDoc(doc(db, "listing", draftId));
      if (existing.exists()) {
        existingCreatedAt = existing.data().createdAt;
      }
    } catch (err) {
      console.error("Error checking existing listing:", err);
    }
  }

  const payloadRaw: any = {
    hostId: user.uid,
    title: formData.title,
    description: formData.description,
    category: formData.category || "home",
    price: formData.price ? Number(formData.price) : undefined,
    discount: formData.discount ? Number(formData.discount) : undefined,
    promo: formData.promo || undefined,
    location: formData.location,
    maxGuests: formData.maxGuests ? Number(formData.maxGuests) : undefined,
    bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
    bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
    amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()).filter(Boolean) : [],
    availableDates: finalAvailableDates,
    blockedDates,
    images: [],
    status,
    createdAt: existingCreatedAt || new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };

  // Remove undefined values before saving to Firestore
  const payload = removeUndefined(payloadRaw);

  if (draftId) {
    await setDoc(doc(db, "listing", draftId), payload, { merge: true });
    console.log("Listing updated with payload:", payload);
    return draftId;
  } else {
    const newId = await createListing(payload);
    console.log("New listing created with ID:", newId, "Payload:", payload);
    return newId;
  }
};

  // Main submit handler (Publish via "Save as Draft" button uses same flow but with status draft)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // If saveAsDraft was set by the Save as Draft button, persist as draft.
      if (saveAsDraft) {
        // manual save (give user feedback)
        await saveDraftToFirestore({ manual: true });
        setSaveAsDraft(false);
        setLoading(false);
        return;
      }

      // Otherwise treat as "publish" (status pending) and handle images
      const listingId = await persistListing("pending");

      if (images.length > 0) {
        const imageUrls = await uploadListingImages(images, listingId);
        // update the listing with images
        await setDoc(doc(db, "listing", listingId), { images: imageUrls, updatedAt: serverTimestamp() }, { merge: true });
      }

      toast.success("Listing created successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  // Called after payment succeeds
  const createListingAfterPayment = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const listingId = await persistListing("pending");

      if (images.length > 0) {
        const imageUrls = await uploadListingImages(images, listingId);
        await setDoc(doc(db, "listing", listingId), { images: imageUrls, updatedAt: serverTimestamp() }, { merge: true });
      }

      toast.success("Payment received. Listing submitted for review!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create listing after payment");
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
      {/* Draft confirmation dialog (custom, using your Dialog component) */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Draft Found</DialogTitle>
            <DialogDescription>
              We found a saved draft for this account. Would you like to continue editing it or discard it and start fresh?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={async () => {
                // discard then close
                await discardDraft();
              }}
            >
              Discard Draft
            </Button>
            <Button
              onClick={async () => {
                await loadDraft();
              }}
            >
              Continue Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  onClick={() => document.getElementById("images")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Images ({images.length} selected)
              </Button>
            </div>
              <p className="text-xs text-muted-foreground mt-1">
                Note: images are uploaded only when you publish (to avoid large autosave uploads).
              </p>
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
              type="button"
              variant="outline"
              disabled={loading}
              className="flex-1"
              onClick={async (e) => {
                e.preventDefault();
                await saveDraftToFirestore({ manual: true });
              }}
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
              <div className="font-medium">{formData.title || "Untitled Listing"}</div>
              <div className="text-sm text-muted-foreground">Category: {formData.category}</div>
              <div className="text-sm text-muted-foreground">Location: {formData.location || "-"}</div>
              <div className="text-sm text-muted-foreground">
                {dateRange.from && dateRange.to ? `Availability: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : "Availability: Not set"}
              </div>
            </div>

            {user && (
              <PayPalButton
                amount={SUBSCRIPTION_FEE}
                userId={user.uid}
                description={`Host subscription for listing: ${formData.title || "Untitled"}`}
                onSuccess={createListingAfterPayment}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
