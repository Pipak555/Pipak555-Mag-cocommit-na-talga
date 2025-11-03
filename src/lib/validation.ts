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
  location: z
    .string()
    .min(5, "Location must be at least 5 characters")
    .max(200, "Location must not exceed 200 characters")
    .trim(),
  maxGuests: z
    .string()
    .min(1, "Max guests is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val)),
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
      (val) => !val || val.trim() === "" || (!isNaN(Number(val)) && Number(val) >= 0),
      "Bathrooms must be a non-negative number (can be 0.5, 1, 1.5, etc.)"
    ),
  amenities: z.string().optional().default(""),
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
});

export type ListingFormData = z.infer<typeof listingFormSchema>;

