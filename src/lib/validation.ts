import { z } from "zod";

export const listingFormSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(100, "Title must not exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(2000, "Description must not exceed 2000 characters")
    .trim(),
  category: z.enum(["home", "experience", "service"], {
    required_error: "Please select a category",
  }),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Price must be a positive number"
    ),
  discount: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "Discount must be between 0 and 100"
    ),
  promo: z.string().max(100, "Promo description must not exceed 100 characters").optional(),
  promoCode: z.string().max(50, "Promo code must not exceed 50 characters").optional(),
  promoDescription: z.string().max(100, "Discount description must not exceed 100 characters").optional(),
  promoDiscount: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "Promo discount must be between 0 and 100"
    ),
  promoMaxUses: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val))),
      "Maximum uses must be a positive integer"
    ),
  location: z
    .string()
    .min(5, "Location must be at least 5 characters")
    .max(200, "Location must not exceed 200 characters")
    .trim(),
  // House-specific fields
  maxGuests: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val))),
      "Max guests must be a positive integer"
    ),
  bedrooms: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))),
      "Bedrooms must be a non-negative integer"
    ),
  bathrooms: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))),
      "Bathrooms must be a non-negative integer"
    ),
  houseType: z.string().optional(),
  amenities: z.string().optional().default(""),
  
  // Service-specific fields
  duration: z.string().optional(),
  serviceType: z.string().optional(),
  requirements: z.string().optional(),
  locationRequired: z.boolean().optional(),
  
  // Experience-specific fields
  capacity: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val))),
      "Capacity must be a positive integer"
    ),
  schedule: z.string().optional(),
  whatsIncluded: z.string().optional(),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .refine(
      (data) => {
        if (!data.from && !data.to) return true; // Both optional
        if (data.from && data.to) {
          return data.to >= data.from;
        }
        return true; // Partial selection is okay
      },
      {
        message: "End date must be after start date",
        path: ["to"],
      }
    )
    .refine(
      (data) => {
        if (data.from) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return data.from >= today;
        }
        return true;
      },
      {
        message: "Start date cannot be in the past",
        path: ["from"],
      }
    ),
  images: z
    .array(z.instanceof(File))
    .max(10, "Maximum 10 images allowed")
    .optional()
    .default([]),
}).refine((data) => {
  // Category-specific validation
  if (data.category === 'home') {
    // For home, maxGuests is required
    return !!(data.maxGuests && data.maxGuests.trim() && Number(data.maxGuests) > 0);
  }
  if (data.category === 'experience') {
    // For experience, capacity is required
    return !!(data.capacity && data.capacity.trim() && Number(data.capacity) > 0);
  }
  // Service has no required category-specific fields
  return true;
}, {
  message: "Please fill in all required fields for this category",
  path: ["category"],
});

export type ListingFormData = z.infer<typeof listingFormSchema>;

// Authentication form schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters")
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
  confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;

