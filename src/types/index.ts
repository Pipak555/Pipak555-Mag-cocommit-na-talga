export interface Listing {
  id: string;
  hostId: string;
  title: string;
  description: string;
  category: 'home' | 'experience' | 'service';
  price: number;
  discount?: number; // percentage discount
  promo?: string; // promo code or description
  location: string;
  images: string[];
  amenities: string[];
  maxGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  availableDates?: string[]; // array of ISO date strings
  blockedDates?: string[]; // dates when property is not available
  createdAt: string;
  updatedAt: string;
  // Rating data (calculated from reviews)
  averageRating?: number;
  reviewCount?: number;
}

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  hostId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  originalPrice?: number; // Price before any discounts
  listingDiscount?: number; // Listing discount percentage
  listingDiscountAmount?: number; // Listing discount amount in PHP
  couponCode?: string; // Applied coupon code
  discountAmount?: number; // Total discount amount applied (listing + coupon)
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface Review {
  id: string;
  listingId: string;
  bookingId: string;
  guestId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  bookingId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'reward';
  amount: number;
  description: string;
  status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'pending_transfer';
  paymentMethod?: string;
  paymentId?: string;
  bookingId?: string; // Link to booking
  guestId?: string; // For platform transactions
  hostId?: string; // For platform transactions
  serviceFee?: number; // Service fee amount
  netAmount?: number; // Net amount after fees
  grossAmount?: number; // Gross amount before fees
  cancelledBy?: 'guest' | 'host' | 'admin'; // Who cancelled
  originalTransactionId?: string; // For refunds
  refundedAt?: string; // When refund was processed
  adminPayPalEmail?: string; // Admin PayPal account for service fees
  originalPaymentMethod?: 'paypal' | 'wallet'; // Original payment method for service fee tracking
  refundReason?: string; // Reason for refund
  confirmedAt?: string; // When transaction was confirmed
  // Payout tracking (for PayPal payouts)
  payoutId?: string; // PayPal payout batch ID
  payoutStatus?: 'pending' | 'processing' | 'completed' | 'failed'; // Payout status
  payoutBatchId?: string; // PayPal batch ID
  payoutProcessedAt?: string; // When payout was processed
  payoutMethod?: 'paypal'; // Payout method
  payoutError?: string; // Error message if payout failed
  createdAt: string;
}

export interface NotificationPreferences {
  email: {
    bookingConfirmations: boolean;
    bookingCancellations: boolean;
    bookingReminders: boolean;
    newMessages: boolean;
    paymentUpdates: boolean;
    promotionalOffers: boolean;
  };
  inApp: {
    bookingUpdates: boolean;
    newMessages: boolean;
    paymentNotifications: boolean;
    systemAlerts: boolean;
  };
}

export interface WishlistItem {
  listingId: string;
  recommendations?: string; // Guest's recommendations/wishes for improvements (text)
  propertyRequirements?: {
    beds?: number;
    bedrooms?: number;
    bathrooms?: number;
    guests?: number;
  };
  desiredAmenities?: string[]; // Array of amenity names (e.g., ['WiFi', 'Kitchen', 'Pool'])
  addedAt: string;
  addedFromBooking?: string; // Booking ID if added from past booking
}

export interface UserProfile {
  email: string;
  fullName: string;
  role: 'host' | 'guest' | 'admin'; // Primary role (for backward compatibility)
  roles?: ('host' | 'guest' | 'admin')[]; // Array of all roles user has
  createdAt: string;
  points: number; // Guest points
  hostPoints?: number; // Host points (separate from guest points)
  walletBalance: number;
  favorites: string[]; // Liked listings
  wishlist: string[] | WishlistItem[]; // Future planned listings (separate from favorites)
  coupons?: Coupon[];
  notifications?: NotificationPreferences;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number; // Fixed discount amount (not percentage)
  validUntil: string;
  used: boolean;
  usedAt?: string; // When coupon was used
  usedForBookingId?: string; // Booking ID where coupon was used
  minSpend?: number;
  eventId?: string; // ID of the event that distributed this coupon
}

export interface PlatformEvent {
  id: string;
  title: string;
  description: string;
  type: 'coupon' | 'announcement' | 'promotion' | 'maintenance' | 'update';
  targetRoles: ('host' | 'guest' | 'admin')[]; // Which roles should receive this event
  targetUserIds?: string[]; // Specific user IDs (optional, for targeted events)
  couponCode?: string; // If type is 'coupon', the coupon code to distribute
  couponDiscount?: number; // Discount amount for coupon
  couponValidUntil?: string; // When coupon expires
  couponMinSpend?: number; // Minimum purchase for coupon
  actionUrl?: string; // URL to redirect when event is clicked
  createdBy: string; // Admin user ID who created the event
  createdAt: string;
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: string; // When the event expires
  notificationSent: boolean; // Whether notifications have been sent
  notificationSentAt?: string; // When notifications were sent
}

export interface ServiceFee {
  id: string;
  bookingId: string;
  hostId: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'collected';
  createdAt: string;
}

export interface HostPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
}

export interface HostSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  paymentMethod: 'paypal';
  paymentId?: string;
  transactionId?: string;
  cancelledAt?: string;
  // Pending plan change (when user changes plan before current one expires)
  pendingPlanId?: string;
  pendingPlanName?: string;
  pendingAmount?: number;
  pendingBillingCycle?: 'monthly' | 'yearly';
  pendingStartDate?: string;
  pendingEndDate?: string;
  pendingPaymentId?: string;
  pendingTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}