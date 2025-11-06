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
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
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
  refundReason?: string; // Reason for refund
  confirmedAt?: string; // When transaction was confirmed
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

export interface UserProfile {
  email: string;
  fullName: string;
  role: 'host' | 'guest' | 'admin'; // Primary role (for backward compatibility)
  roles?: ('host' | 'guest' | 'admin')[]; // Array of all roles user has
  createdAt: string;
  points: number;
  walletBalance: number;
  favorites: string[]; // Liked listings
  wishlist: string[]; // Future planned listings (separate from favorites)
  coupons?: Coupon[];
  notifications?: NotificationPreferences;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number; // percentage
  validUntil: string;
  used: boolean;
  minSpend?: number;
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
