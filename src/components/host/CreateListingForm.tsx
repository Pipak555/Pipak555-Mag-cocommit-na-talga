import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ImagePreview } from "./ImagePreview";
import { LocationMapPicker } from "./LocationMapPicker";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { createListing, uploadListingImages, getListing, updateListing } from "@/lib/firestore";
import { listingFormSchema, type ListingFormData } from "@/lib/validation";
import { toast } from "sonner";
import { formatPHP } from "@/lib/currency";
import { Upload, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

// Firebase imports used for draft handling
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGES = 10;

export const CreateListingForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { user, userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const editListingId = searchParams.get('edit');
  const isEditMode = !!editListingId;
  
  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [draftFound, setDraftFound] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false); // Track if listing has been published
  const [isPromoCodeGenerated, setIsPromoCodeGenerated] = useState(false); // Track if promo code was auto-generated
  const [isGeneratingPromoCode, setIsGeneratingPromoCode] = useState(false); // Track if generating promo code

  // debounce timer ref
  const saveTimeoutRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "home",
      price: "",
      discount: "",
      promo: "",
      promoCode: "",
      promoDescription: "",
      promoDiscount: "",
      promoMaxUses: "",
      location: "",
      maxGuests: "",
      bedrooms: "",
      bathrooms: "",
      amenities: "",
      dateRange: { from: undefined, to: undefined },
      images: [],
    },
    mode: "onChange",
    shouldFocusError: true,
  });

  const watchedValues = form.watch();
  const formErrors = form.formState.errors;
  

  // Helper: deterministic draft doc id (one draft per user)
  const getDraftDocId = useCallback(() => {
    if (!user) return null;
    return `${user.uid}_draft`;
  }, [user]);

  // Calculate form completion percentage
  const calculateCompletion = useCallback(() => {
    const fields = [
      watchedValues.title,
      watchedValues.description,
      watchedValues.price,
      watchedValues.location,
      watchedValues.maxGuests,
      watchedValues.dateRange?.from && watchedValues.dateRange?.to,
      images.length > 0,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [watchedValues, images.length]);

  const completionPercentage = calculateCompletion();

  // Utility to generate list of iso date strings from range
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

  // Image validation
  const validateImage = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return `File size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const error = validateImage(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join(", "));
    }

    // Calculate available slots (account for existing images in edit mode)
    const existingCount = isEditMode ? existingImages.length : 0;
    const availableSlots = MAX_IMAGES - existingCount;
    const newImages = [...images, ...validFiles].slice(0, availableSlots);
    
    if (validFiles.length > availableSlots) {
      toast.warning(`Maximum ${MAX_IMAGES} total images allowed. You can add ${availableSlots} more image(s).`);
    }

    setImages(newImages);
    form.setValue("images", newImages, { shouldValidate: true });
    
    // Reset file input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    form.setValue("images", newImages, { shouldValidate: true });
  };

  // Save draft to Firestore (debounced by caller)
  const saveDraftToFirestore = useCallback(
    async (opts?: { manual?: boolean }) => {
      if (!user) return;
      // Don't save draft if listing has been published
      if (isPublished) {
        console.log('saveDraftToFirestore: Skipping save - listing already published');
        return;
      }
      
      const id = getDraftDocId();
      if (!id) return;

      const formValues = form.getValues();
      // Get dateRange from form values - ensure we capture it properly
      const dateRange = formValues.dateRange || { from: undefined, to: undefined };
      // Generate availableDates from dateRange if both dates are present
      const finalAvailableDates = dateRange?.from && dateRange?.to
        ? generateAvailableDates(dateRange.from, dateRange.to)
        : (availableDates.length > 0 ? availableDates : []);

      // Check if draft already exists to preserve createdAt and status
      let existingCreatedAt = null;
      let existingStatus = null;
      try {
        const existing = await getDoc(doc(db, "listing", id));
        if (existing.exists()) {
          const existingData = existing.data();
          existingCreatedAt = existingData.createdAt;
          existingStatus = existingData.status;
          
          // Don't overwrite if listing is not a draft (e.g., pending, approved, rejected)
          if (existingStatus && existingStatus !== "draft") {
            console.log('saveDraftToFirestore: Skipping save - listing status is', existingStatus, 'not draft');
            return;
          }
        }
      } catch (err) {
        console.error("Error checking existing draft:", err);
      }

      const payloadRaw = {
        hostId: user.uid,
        title: formValues.title || "",
        description: formValues.description || "",
        category: formValues.category || "home",
        price: formValues.price ? Number(formValues.price) : undefined,
        discount: formValues.discount && formValues.discount.trim() ? Number(formValues.discount) : undefined,
        promo: formValues.promo || undefined,
        location: formValues.location || "",
        maxGuests: formValues.maxGuests ? Number(formValues.maxGuests) : undefined,
        bedrooms: formValues.bedrooms && formValues.bedrooms.trim() ? Number(formValues.bedrooms) : undefined,
        bathrooms: formValues.bathrooms && formValues.bathrooms.trim() ? Number(formValues.bathrooms) : undefined,
        amenities: formValues.amenities ? formValues.amenities.split(",").map(a => a.trim()).filter(Boolean) : [],
        availableDates: finalAvailableDates,
        blockedDates,
        images: [],
        status: "draft", // Only save as draft
        // Also save dateRange directly for easier loading
        dateRange: dateRange?.from && dateRange?.to ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        } : undefined,
        createdAt: existingCreatedAt || new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };

      const payload = removeUndefined(payloadRaw);

      try {
        setSaveStatus("saving");
        await setDoc(doc(db, "listing", id), payload, { merge: true });
        setDraftId(id);
        setSaveStatus("saved");
        if (opts?.manual) {
          toast.success("Draft saved successfully");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch (err: any) {
        console.error("Failed to save draft:", err);
        setSaveStatus("error");
        const errorMessage = err.code === "permission-denied"
          ? "Permission denied. Please check your permissions."
          : err.code === "unavailable"
          ? "Network error. Please check your connection."
          : "Failed to save draft";
        if (opts?.manual) {
          toast.error(errorMessage);
        } else {
          toast.error("Auto-save failed. Please save manually.", { duration: 3000 });
        }
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    [user, getDraftDocId, form, availableDates, blockedDates, isPublished]
  );

  // Debounced autosave effect (disabled in edit mode)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!user) return;
    
    // Don't auto-save if we're in edit mode, payment flow, if listing is already published, or if loading
    if (isEditMode || loading || isPublished) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      // Always save if form is dirty OR if dateRange has changed
      if (form.formState.isDirty || watchedValues.dateRange?.from || watchedValues.dateRange?.to) {
        saveDraftToFirestore();
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, watchedValues.dateRange, images, user, form.formState.isDirty, saveDraftToFirestore, loading, isPublished, isEditMode]);

  // Save draft on page unload (disabled in edit mode)
  useEffect(() => {
    if (isEditMode) return; // Don't save draft in edit mode
    
    const handler = () => {
      if (user && form.formState.isDirty && !isPublished) {
        saveDraftToFirestore();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveDraftToFirestore, user, form.formState.isDirty, isPublished, isEditMode]);

  // Load existing listing data when in edit mode
  useEffect(() => {
    const loadExistingListing = async () => {
      if (!isEditMode || !editListingId || !user) return;
      
      setLoadingListing(true);
      try {
        const listing = await getListing(editListingId);
        if (!listing) {
          toast.error("Listing not found");
          return;
        }

        // Check if user owns this listing
        if (listing.hostId !== user.uid) {
          toast.error("You don't have permission to edit this listing");
          return;
        }

        // Load existing data into form
        const existingPromoCode = (listing as any).promoCode || "";
        form.reset({
          title: listing.title || "",
          description: listing.description || "",
          category: listing.category || "home",
          price: listing.price ? String(listing.price) : "",
          discount: listing.discount ? String(listing.discount) : "",
          promo: listing.promo || "",
          promoCode: existingPromoCode,
          promoDescription: (listing as any).promoDescription || "",
          promoDiscount: (listing as any).promoDiscount ? String((listing as any).promoDiscount) : "",
          promoMaxUses: (listing as any).promoMaxUses ? String((listing as any).promoMaxUses) : "",
          location: listing.location || "",
          maxGuests: listing.maxGuests ? String(listing.maxGuests) : "",
          bedrooms: listing.bedrooms ? String(listing.bedrooms) : "",
          bathrooms: listing.bathrooms ? String(listing.bathrooms) : "",
          amenities: Array.isArray(listing.amenities) ? listing.amenities.join(", ") : "",
          dateRange: listing.availableDates && listing.availableDates.length > 0
            ? {
                from: new Date(listing.availableDates[0]),
                to: new Date(listing.availableDates[listing.availableDates.length - 1]),
              }
            : { from: undefined, to: undefined },
          images: [],
        });
        
        // Set promo code generated state if editing and promo code exists
        if (existingPromoCode && existingPromoCode.startsWith('PROMO-')) {
          setIsPromoCodeGenerated(true);
        }

        // Set existing images
        if (listing.images && Array.isArray(listing.images)) {
          setExistingImages(listing.images);
        }

        // Set dates
        if (listing.availableDates && Array.isArray(listing.availableDates)) {
          setAvailableDates(listing.availableDates);
        }
        if (listing.blockedDates && Array.isArray(listing.blockedDates)) {
          setBlockedDates(listing.blockedDates);
        }

        // Disable auto-save in edit mode
        setIsPublished(true);
        
        toast.success("Listing loaded successfully");
      } catch (error: any) {
        console.error("Error loading listing:", error);
        toast.error(`Failed to load listing: ${error.message || 'Unknown error'}`);
      } finally {
        setLoadingListing(false);
      }
    };

    loadExistingListing();
  }, [isEditMode, editListingId, user, form]);

  // On mount: check if a draft exists (only in create mode)
  useEffect(() => {
    if (isEditMode) return; // Skip draft check in edit mode
    
    const checkDraft = async () => {
      if (!user) return;
      const id = getDraftDocId();
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "listing", id));
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === "draft") {
            setDraftFound(true);
            setShowDraftDialog(true);
            setDraftId(id);
          }
        }
      } catch (err: any) {
        if (err.code !== "permission-denied") {
          console.error("Failed to check draft:", err);
        }
      }
    };
    checkDraft();
  }, [user, getDraftDocId, isEditMode]);

  // Load the draft into form state
  const loadDraft = async () => {
    if (!draftId) return;
    try {
      const snap = await getDoc(doc(db, "listing", draftId));
      if (!snap.exists()) return;
      const data = snap.data() as any;

      form.reset({
        title: data.title || "",
        description: data.description || "",
        category: (data.category as "home" | "experience" | "service") || "home",
        price: data.price ? String(data.price) : "",
        discount: data.discount ? String(data.discount) : "",
        promo: data.promo || "",
        promoCode: (data as any).promoCode || "",
        promoDescription: (data as any).promoDescription || "",
        promoDiscount: (data as any).promoDiscount ? String((data as any).promoDiscount) : "",
        promoMaxUses: (data as any).promoMaxUses ? String((data as any).promoMaxUses) : "",
        location: data.location || "",
        maxGuests: data.maxGuests ? String(data.maxGuests) : "",
        bedrooms: data.bedrooms ? String(data.bedrooms) : "",
        bathrooms: data.bathrooms ? String(data.bathrooms) : "",
        amenities: Array.isArray(data.amenities) ? data.amenities.join(", ") : (data.amenities || ""),
        dateRange: data.availableDates && Array.isArray(data.availableDates) && data.availableDates.length > 0
          ? {
              from: new Date(data.availableDates[0]),
              to: new Date(data.availableDates[data.availableDates.length - 1]),
            }
          : (data.dateRange ? {
              from: data.dateRange.from ? new Date(data.dateRange.from) : undefined,
              to: data.dateRange.to ? new Date(data.dateRange.to) : undefined,
            } : { from: undefined, to: undefined }),
        images: [],
      });

      if (data.availableDates && Array.isArray(data.availableDates)) {
        setAvailableDates(data.availableDates);
      }
      if (data.blockedDates && Array.isArray(data.blockedDates)) {
        setBlockedDates(data.blockedDates);
      }

      setShowDraftDialog(false);
      toast.success("Draft loaded successfully");
    } catch (err: any) {
      console.error("Failed to load draft:", err);
      const errorMessage = err.code === "permission-denied"
        ? "Permission denied. Unable to load draft."
        : "Failed to load draft";
      toast.error(errorMessage);
    }
  };

  // Discard draft
  const discardDraft = async () => {
    if (!draftId) {
      setShowDraftDialog(false);
      setDraftFound(false);
      setDiscardConfirmOpen(false);
      form.reset();
      return;
    }
    try {
      await deleteDoc(doc(db, "listing", draftId));
      setDraftId(null);
      setShowDraftDialog(false);
      setDraftFound(false);
      setDiscardConfirmOpen(false);
      form.reset();
      setAvailableDates([]);
      setBlockedDates([]);
      setImages([]);
      toast.success("Draft discarded");
    } catch (err: any) {
      console.error("Failed to discard draft:", err);
      const errorMessage = err.code === "permission-denied"
        ? "Permission denied. Unable to discard draft."
        : "Failed to discard draft";
      toast.error(errorMessage);
    }
  };

  // Helper to publish/update listing
  const persistListing = async (status: "pending" | "draft") => {
    if (!user) throw new Error("No user");
    const formValues = form.getValues();
    const finalAvailableDates = formValues.dateRange?.from && formValues.dateRange?.to
      ? generateAvailableDates(formValues.dateRange.from, formValues.dateRange.to)
      : availableDates;

    let existingCreatedAt = null;
    if (draftId && status === "draft") {
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
      title: formValues.title,
      description: formValues.description,
      category: formValues.category || "home",
      price: Number(formValues.price),
      discount: formValues.discount && formValues.discount.trim() ? Number(formValues.discount) : undefined,
      promo: formValues.promo || undefined,
      promoCode: formValues.promoCode || undefined,
      promoDescription: formValues.promoDescription || undefined,
      promoDiscount: formValues.promoDiscount && formValues.promoDiscount.trim() ? Number(formValues.promoDiscount) : undefined,
      promoMaxUses: formValues.promoMaxUses && formValues.promoMaxUses.trim() ? Number(formValues.promoMaxUses) : undefined,
      location: formValues.location,
      maxGuests: Number(formValues.maxGuests),
      bedrooms: formValues.bedrooms && formValues.bedrooms.trim() ? Number(formValues.bedrooms) : undefined,
      bathrooms: formValues.bathrooms && formValues.bathrooms.trim() ? Number(formValues.bathrooms) : undefined,
      amenities: formValues.amenities ? formValues.amenities.split(",").map((a: string) => a.trim()).filter(Boolean) : [],
      availableDates: finalAvailableDates,
      blockedDates,
      images: [],
      status: status || 'pending', // Safety check: ensure status is never undefined
      createdAt: existingCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(), // Use regular timestamp since createListing overwrites it
    };

    const payload = removeUndefined(payloadRaw);
    
    console.log('persistListing: Preparing payload with status:', payload.status);
    console.log('persistListing: Full payload keys:', Object.keys(payload));

    if (status === "pending") {
      console.log('persistListing: Creating listing with status "pending"');
      // Ensure status is explicitly set to "pending"
      const pendingPayload = {
        ...payload,
        status: "pending" as const, // Explicitly set status to pending
      };
      const newId = await createListing(pendingPayload);
      
      // Verify the listing was created with correct status
      const listingDoc = await getDoc(doc(db, "listing", newId));
      if (listingDoc.exists()) {
        const listingData = listingDoc.data();
        if (listingData.status !== "pending") {
          console.warn('persistListing: Listing status is not "pending" after creation, fixing it...');
          await updateDoc(doc(db, "listing", newId), {
            status: "pending",
            updatedAt: new Date().toISOString(),
          });
        }
      }
      
      if (draftId) {
        try {
          await deleteDoc(doc(db, "listing", draftId));
          console.log('persistListing: Draft deleted successfully');
        } catch (err) {
          console.error("Error deleting draft:", err);
        }
      }
      setDraftId(null);
      setDraftFound(false);
      return newId;
    } else {
      if (draftId) {
        await setDoc(doc(db, "listing", draftId), payload, { merge: true });
        return draftId;
      } else {
        const newId = await createListing(payload);
        setDraftId(newId);
        return newId;
      }
    }
  };

  // Upload images with progress
  const uploadImagesWithProgress = async (files: File[], listingId: string): Promise<string[]> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Use Cloudinary upload with progress callback
      const { uploadListingImages: uploadToCloudinary } = await import('@/lib/cloudinary');
      const uploadPromise = uploadToCloudinary(files, listingId, (progress) => {
        setUploadProgress(progress);
      });
      
      const urls = await uploadPromise;
      setUploadProgress(100);
      
      return urls;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Create listing after payment
  const createListingAfterPayment = async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log('createListingAfterPayment: Starting listing creation with status "pending"');
      const listingId = await persistListing("pending");
      console.log('createListingAfterPayment: Listing created with ID:', listingId);

      // Verify the listing was created with status "pending"
      const listingDoc = await getDoc(doc(db, "listing", listingId));
      if (listingDoc.exists()) {
        const listingData = listingDoc.data();
        console.log('createListingAfterPayment: Listing status after creation:', listingData.status);
        
        // If status is not "pending", fix it
        if (listingData.status !== "pending") {
          console.warn('createListingAfterPayment: Listing status is not "pending", fixing it...');
          await setDoc(doc(db, "listing", listingId), {
            status: "pending",
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (images.length > 0) {
        console.log('createListingAfterPayment: Uploading', images.length, 'images');
        const imageUrls = await uploadImagesWithProgress(images, listingId);
        console.log('createListingAfterPayment: Images uploaded, updating listing with URLs');
        // Explicitly preserve status when updating with images
        await setDoc(doc(db, "listing", listingId), {
          images: imageUrls,
          status: "pending", // Explicitly set status to pending
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('createListingAfterPayment: Listing updated with images and status preserved');
      }

      setDraftId(null);
      setDraftFound(false);
      setIsPublished(true); // Mark as published to prevent auto-save from overwriting
      console.log('createListingAfterPayment: Success! Listing ID:', listingId, 'Status: pending');
      toast.success("Payment received. Listing submitted for review!");
      onSuccess();
    } catch (error: any) {
      console.error('createListingAfterPayment: Error occurred:', error);
      console.error('createListingAfterPayment: Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      const errorMessage = error.code === "permission-denied"
        ? "Permission denied. Please check your permissions."
        : error.code === "unavailable"
        ? "Network error. Please check your connection and try again."
        : error.message || "Failed to create listing after payment";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!user) return;

    // Check if email is verified
    if (!userProfile?.emailVerified) {
      toast.error('Please verify your email address to create listings. Check your inbox for a verification code.');
      return;
    }

    // Trigger validation for all fields
    const isValid = await form.trigger();
    const dateRange = form.getValues("dateRange");
    const formErrors = form.formState.errors;
    
    // Check date range
    if (!dateRange?.from || !dateRange?.to) {
      form.setError("dateRange.to", { message: "Date range is required" });
      await form.trigger("dateRange");
    }

    // Check if there are images (new or existing in edit mode)
    const totalImages = (isEditMode ? existingImages.length : 0) + images.length;
    if (totalImages === 0) {
      form.setError("images", { 
        type: "manual",
        message: "At least 1 image is required" 
      });
      await form.trigger("images");
    }

    // If there are any errors, show them and scroll to first error
    if (!isValid || !dateRange?.from || !dateRange?.to || totalImages === 0) {
      toast.error("Please fix all errors in the form before proceeding.");
      // Scroll to first error field
      const firstErrorField = Object.keys(formErrors)[0] || "dateRange" || "images";
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                          document.querySelector('[name="dateRange"]') ||
                          document.querySelector('[name="images"]');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
      return;
    }

    // Show confirmation dialog before submitting
    setSubmitConfirmOpen(true);
  };

  const confirmSubmitListing = async () => {
    setSubmitConfirmOpen(false);
    // Submit listing for free - payment will be processed when admin approves
    await handleSubmitListing();
  };

  const handleSubmitListing = async () => {
    if (!user) return;

    // Check if email is verified
    if (!userProfile?.emailVerified) {
      toast.error('Please verify your email address to create listings. Check your inbox for a verification code.');
      return;
    }
    
    // Trigger validation for all fields
    const isValid = await form.trigger();
    const dateRange = form.getValues("dateRange");
    const formErrors = form.formState.errors;
    
    // Check date range
    if (!dateRange?.from || !dateRange?.to) {
      form.setError("dateRange.to", { message: "Date range is required" });
      await form.trigger("dateRange");
    }

    // Check if there are images (new or existing in edit mode)
    const totalImages = (isEditMode ? existingImages.length : 0) + images.length;
    if (totalImages === 0) {
      form.setError("images", { 
        type: "manual",
        message: "At least 1 image is required" 
      });
      await form.trigger("images");
    }

    // If there are any errors, show them and scroll to first error
    if (!isValid || !dateRange?.from || !dateRange?.to || totalImages === 0) {
      toast.error("Please fix all errors in the form before submitting.");
      // Scroll to first error field
      const firstErrorField = Object.keys(formErrors)[0] || "dateRange" || "images";
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                          document.querySelector('[name="dateRange"]') ||
                          document.querySelector('[name="images"]');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
      return;
    }
    
    setLoading(true);
    try {
      console.log('handleSubmitListing: Starting listing creation with status "pending"');
      const listingId = await persistListing("pending");
      console.log('handleSubmitListing: Listing created with ID:', listingId);

      // Verify the listing was created with status "pending"
      const listingDoc = await getDoc(doc(db, "listing", listingId));
      if (listingDoc.exists()) {
        const listingData = listingDoc.data();
        console.log('handleSubmitListing: Listing status after creation:', listingData.status);
        
        // If status is not "pending", fix it
        if (listingData.status !== "pending") {
          console.warn('handleSubmitListing: Listing status is not "pending", fixing it...');
          await setDoc(doc(db, "listing", listingId), {
            status: "pending",
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (images.length > 0) {
        console.log('handleSubmitListing: Uploading', images.length, 'images');
        const imageUrls = await uploadImagesWithProgress(images, listingId);
        console.log('handleSubmitListing: Images uploaded, updating listing with URLs');
        // Explicitly preserve status when updating with images
        await setDoc(doc(db, "listing", listingId), {
          images: imageUrls,
          status: "pending", // Explicitly set status to pending
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('handleSubmitListing: Listing updated with images and status preserved');
      }

      setDraftId(null);
      setDraftFound(false);
      setIsPublished(true); // Mark as published to prevent auto-save from overwriting
      console.log('handleSubmitListing: Success! Listing ID:', listingId, 'Status: pending');
      toast.success("Listing submitted for review! Payment will be processed when approved.");
      onSuccess();
    } catch (error: any) {
      console.error('handleSubmitListing: Error occurred:', error);
      console.error('handleSubmitListing: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast.error(error.message || "Failed to submit listing");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    // Allow saving drafts even if required fields are missing
    // No validation needed for drafts - they can be incomplete
    await saveDraftToFirestore({ manual: true });
  };

  // Save/update listing in edit mode
  const handleSaveListing = async () => {
    if (!isEditMode || !editListingId || !user) return;

    // Trigger validation for all fields
    const isValid = await form.trigger();
    const formErrors = form.formState.errors;

    // Check if there are images (existing or new)
    const totalImages = existingImages.length + images.length;
    if (totalImages === 0) {
      form.setError("images", { 
        type: "manual",
        message: "At least 1 image is required" 
      });
      await form.trigger("images");
    }

    // If there are any errors, show them and scroll to first error
    if (!isValid || totalImages === 0) {
      toast.error("Please fix all errors in the form before saving.");
      // Scroll to first error field
      const firstErrorField = Object.keys(formErrors)[0] || "images";
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                          document.querySelector('[name="images"]');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
      return;
    }

    setLoading(true);
    setSaveStatus("saving");

    try {
      const formValues = form.getValues();
      const finalAvailableDates = formValues.dateRange?.from && formValues.dateRange?.to
        ? generateAvailableDates(formValues.dateRange.from, formValues.dateRange.to)
        : availableDates;

      // Prepare update data
      const updateData: any = {
        title: formValues.title,
        description: formValues.description,
        category: formValues.category || "home",
        price: Number(formValues.price),
        discount: formValues.discount && formValues.discount.trim() ? Number(formValues.discount) : undefined,
        promo: formValues.promo || undefined,
        promoCode: formValues.promoCode || undefined,
        promoDescription: formValues.promoDescription || undefined,
        promoDiscount: formValues.promoDiscount && formValues.promoDiscount.trim() ? Number(formValues.promoDiscount) : undefined,
        promoMaxUses: formValues.promoMaxUses && formValues.promoMaxUses.trim() ? Number(formValues.promoMaxUses) : undefined,
        location: formValues.location,
        maxGuests: Number(formValues.maxGuests),
        bedrooms: formValues.bedrooms && formValues.bedrooms.trim() ? Number(formValues.bedrooms) : undefined,
        bathrooms: formValues.bathrooms && formValues.bathrooms.trim() ? Number(formValues.bathrooms) : undefined,
        amenities: formValues.amenities ? formValues.amenities.split(",").map((a: string) => a.trim()).filter(Boolean) : [],
        availableDates: finalAvailableDates,
        blockedDates,
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined values
      const cleanedData = removeUndefined(updateData);

      // Upload new images if any
      let imageUrls = [...existingImages];
      if (images.length > 0) {
        const newImageUrls = await uploadImagesWithProgress(images, editListingId);
        imageUrls = [...existingImages, ...newImageUrls];
      }

      // Update listing with new data and images
      await updateListing(editListingId, {
        ...cleanedData,
        images: imageUrls,
      });

      setSaveStatus("saved");
      setExistingImages(imageUrls);
      setImages([]); // Clear new images after saving
      toast.success("Listing updated successfully!");
      
      // Reset form dirty state
      form.reset(form.getValues(), { keepDirty: false });
    } catch (error: any) {
      console.error("Error updating listing:", error);
      setSaveStatus("error");
      toast.error(`Failed to update listing: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  return (
    <>
      {/* Draft confirmation dialog */}
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
              onClick={() => {
                setShowDraftDialog(false);
                setDiscardConfirmOpen(true);
              }}
            >
              Discard Draft
            </Button>
            <Button onClick={loadDraft}>
              Continue Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loadingListing ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading listing...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isEditMode ? 'Edit Listing' : 'Create New Listing'}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>Save failed</span>
                </>
              )}
            </div>
          </div>
          {/* Form completion progress */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Form completion</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={isEditMode ? (e) => { e.preventDefault(); handleSaveListing(); } : form.handleSubmit(handleProceedToPayment)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a descriptive title for your listing"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormDescription>
                        {field.value?.length || 0}/100 characters
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your listing in detail. Include amenities, nearby attractions, and what makes it special."
                        className="min-h-[120px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormDescription>
                        {field.value?.length || 0}/2000 characters (minimum 50)
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Category and Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Category <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="experience">Experience</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Price per Night (₱) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Discount and Promo */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>Optional discount percentage (0-100)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="promo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 'Summer Special'"
                            maxLength={100}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>Optional promotional message</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Promo Code Section */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Create a Promo Code</CardTitle>
                    <CardDescription>Generate and customize special promo codes for your guests.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="promoCode"
                      render={({ field }) => {
                        // Check if promo code exists and was generated (starts with PROMO-)
                        const isGenerated = isPromoCodeGenerated || (field.value && field.value.startsWith('PROMO-'));
                        
                        return (
                          <FormItem>
                            <FormLabel>Promo Code</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="PROMO-XXXXXX"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Only allow editing if not generated
                                    if (!isGenerated) {
                                      field.onChange(e.target.value.toUpperCase());
                                      setIsPromoCodeGenerated(false);
                                    }
                                  }}
                                  disabled={isGenerated}
                                  className="flex-1"
                                  readOnly={isGenerated}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={async () => {
                                    setIsGeneratingPromoCode(true);
                                    try {
                                      // Generate secure unique promo code
                                      const generateUniquePromoCode = async (): Promise<string> => {
                                        const maxAttempts = 10;
                                        let attempts = 0;
                                        
                                        while (attempts < maxAttempts) {
                                          // Generate a more secure code using crypto if available, otherwise Math.random
                                          let randomPart: string;
                                          if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                                            // Use crypto API for better randomness
                                            const array = new Uint32Array(1);
                                            crypto.getRandomValues(array);
                                            randomPart = array[0].toString(36).toUpperCase().padStart(6, '0').substring(0, 6);
                                          } else {
                                            // Fallback to Math.random with timestamp for better uniqueness
                                            const timestamp = Date.now().toString(36).toUpperCase();
                                            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
                                            randomPart = (timestamp + random).substring(0, 6);
                                          }
                                          
                                          const code = `PROMO-${randomPart}`;
                                          
                                          // Check if code already exists in database
                                          const listingsRef = collection(db, 'listing');
                                          const q = query(listingsRef, where('promoCode', '==', code));
                                          const snapshot = await getDocs(q);
                                          
                                          if (snapshot.empty) {
                                            // Code is unique, return it
                                            return code;
                                          }
                                          
                                          attempts++;
                                        }
                                        
                                        // If we couldn't generate a unique code after max attempts, throw error
                                        throw new Error('Unable to generate a unique promo code. Please try again.');
                                      };
                                      
                                      const uniqueCode = await generateUniquePromoCode();
                                      field.onChange(uniqueCode);
                                      setIsPromoCodeGenerated(true);
                                      toast.success('Unique promo code generated successfully!');
                                    } catch (error: any) {
                                      toast.error(error.message || 'Failed to generate promo code. Please try again.');
                                    } finally {
                                      setIsGeneratingPromoCode(false);
                                    }
                                  }}
                                  disabled={isGeneratingPromoCode || isGenerated}
                                >
                                  {isGeneratingPromoCode ? 'Generating...' : isGenerated ? 'Generated' : 'Generate'}
                                </Button>
                                {isGenerated && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange('');
                                      setIsPromoCodeGenerated(false);
                                      toast.info('Promo code cleared. You can enter a custom code or generate a new one.');
                                    }}
                                    className="text-muted-foreground"
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>
                            </FormControl>
                            <FormDescription>
                              {isGenerated 
                                ? "Generated code is secured and unique. Click 'Clear' to enter a custom code."
                                : "Enter a custom code or generate one automatically (ensures uniqueness)"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="promoDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promo Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 'Summer Special'"
                              maxLength={100}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>Optional promotional message</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="promoDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="15"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="promoMaxUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Uses</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Unlimited"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormDescription>Leave empty for unlimited uses</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Location <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <LocationMapPicker
                        value={field.value || ""}
                        onChange={(location) => {
                          field.onChange(location);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Guests, Bedrooms, Bathrooms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="maxGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Max Guests <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Amenities */}
              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amenities</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="WiFi, Pool, Kitchen, Parking (comma separated)"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>Separate multiple amenities with commas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Range */}
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Availability Date Range <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <DateRangePicker
                        value={field.value as { from: Date | undefined; to: Date | undefined } | undefined}
                        onChange={field.onChange}
                        placeholder="Select your listing availability period"
                        className="mt-2"
                        error={!!formErrors.dateRange}
                      />
                    </FormControl>
                    {field.value?.from && field.value?.to && (
                      <FormDescription>
                        Available from {field.value.from.toLocaleDateString()} to {field.value.to.toLocaleDateString()}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Images */}
              <FormField
                control={form.control}
                name="images"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      Images <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Input
                            id="images"
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("images")?.click()}
                            disabled={(isEditMode ? existingImages.length : 0) + images.length >= MAX_IMAGES}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Images ({(isEditMode ? existingImages.length : 0) + images.length}/{MAX_IMAGES})
                          </Button>
                        </div>
                        {/* Show existing images in edit mode */}
                        {isEditMode && existingImages.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-foreground">Existing Images ({existingImages.length}):</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                              {existingImages.map((imageUrl, index) => (
                                <div key={`existing-${index}`} className="relative group aspect-square">
                                  <div className="w-full h-full rounded-lg overflow-hidden border-2 border-border">
                                    <img
                                      src={imageUrl}
                                      alt={`Existing image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExistingImages(existingImages.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <span className="text-lg font-bold">×</span>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <ImagePreview
                          images={images}
                          onRemove={removeImage}
                          uploadProgress={uploadProgress}
                          isUploading={isUploading}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload at least 1 image (max {MAX_IMAGES}). Accepted formats: JPG, PNG, WebP. Max size: 5MB per image.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {isEditMode ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleSaveListing}
                      disabled={loading || isUploading || saveStatus === "saving"}
                      className="flex-1"
                    >
                      {saveStatus === "saving" || loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : saveStatus === "saved" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onSuccess()}
                      disabled={loading || isUploading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={loading || isUploading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Listing"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || isUploading}
                      className="flex-1"
                      onClick={handleSaveDraft}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save as Draft
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}

      {/* Discard Draft Confirmation */}
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard this draft? All unsaved changes will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={discardDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Listing Confirmation */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Listing for Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Your listing will be submitted for admin review. Once approved, it will be published and visible to guests. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmitListing}>
              Submit Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
