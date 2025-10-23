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
  createdAt: string;
}

export interface UserProfile {
  email: string;
  role: 'host' | 'guest' | 'admin';
  createdAt: string;
  points: number;
  walletBalance: number;
  favorites: string[];
  coupons?: Coupon[];
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
