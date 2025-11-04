import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadListingImages as uploadToCloudinary } from './cloudinary';
import type { Listing, Booking, Review, Message, Transaction } from '@/types';
import { sendBookingConfirmationEmail } from '@/lib/emailjs';

// ✅ Create or update listing (handles draft + normal publish)
export const createOrUpdateListing = async (data: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
  const listingsRef = collection(db, 'listing');

  // If it's a draft, check if one already exists for this host
  if (data.status === 'draft' && data.hostId) {
    const q = query(
      listingsRef,
      where('hostId', '==', data.hostId),
      where('status', '==', 'draft')
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const draftDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'listing', draftDoc.id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      return draftDoc.id;
    }
  }

  // Otherwise, create a new listing
  const docRef = await addDoc(listingsRef, {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
};

// ✅ Fetch existing draft for host (for auto-load + confirmation modal)
export const getHostDraft = async (hostId: string) => {
  const listingsRef = collection(db, 'listing');
  const q = query(listingsRef, where('hostId', '==', hostId), where('status', '==', 'draft'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Listing;
};

// 🏠 Normal listings functions
export const createListing = async (data: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
  // Ensure status is always set - default to 'pending' if not provided
  const listingData = {
    ...data,
    status: data.status || 'pending', // Default to pending if not set
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  console.log('Creating listing with data:', {
    status: listingData.status,
    hostId: listingData.hostId,
    title: listingData.title
  });
  
  const docRef = await addDoc(collection(db, 'listing'), listingData);
  console.log('Listing created with ID:', docRef.id, 'Status:', listingData.status);
  return docRef.id;
};

export const updateListing = async (id: string, data: Partial<Listing>) => {
  await updateDoc(doc(db, 'listing', id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteListing = async (id: string) => {
  await deleteDoc(doc(db, 'listing', id));
};

export const getListing = async (id: string) => {
  const docSnap = await getDoc(doc(db, 'listing', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Listing;
  }
  return null;
};

export const getListings = async (filters?: { category?: string; status?: string; hostId?: string }) => {
  try {
    console.log("getListings called with filters:", JSON.stringify(filters));
    
    // Start with base query - don't use orderBy with where clauses (requires composite index)
    let q = query(collection(db, 'listing'));
    
    // Apply filters (skip empty strings)
    const appliedFilters: string[] = [];
    if (filters?.category && filters.category.trim() !== '' && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category));
      appliedFilters.push(`category == "${filters.category}"`);
    }
    if (filters?.status && filters.status.trim() !== '') {
      q = query(q, where('status', '==', filters.status));
      appliedFilters.push(`status == "${filters.status}"`);
    }
    if (filters?.hostId && filters.hostId.trim() !== '') {
      q = query(q, where('hostId', '==', filters.hostId));
      appliedFilters.push(`hostId == "${filters.hostId}"`);
    }
    
    console.log(`getListings: Applied filters: [${appliedFilters.join(', ')}]`);
    
    // Execute query WITHOUT orderBy (avoids composite index requirement)
    console.log("getListings: Executing Firestore query...");
    const snapshot = await getDocs(q);
    console.log(`getListings: Query successful, found ${snapshot.docs.length} raw documents`);
    
    // Process and filter documents
    const listings = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const docStatus = data.status;
        const docStatusType = typeof docStatus;
        
        console.log(`getListings: Processing document ${doc.id}:`, { 
          hostId: data.hostId, 
          status: docStatus,
          statusType: docStatusType,
          category: data.category 
        });
        
        // Filter out documents with invalid data (empty strings)
        if (!data.hostId || data.hostId.trim() === '' || 
            !data.status || data.status.trim() === '' ||
            !data.category || data.category.trim() === '') {
          console.warn(`getListings: Skipping listing ${doc.id} - missing required fields:`, {
            hostId: data.hostId,
            status: data.status,
            statusType: typeof data.status,
            category: data.category
          });
          return null;
        }
        
        // If status filter is set, double-check the status matches (client-side safety check)
        if (filters?.status && filters.status.trim() !== '' && data.status !== filters.status) {
          console.warn(`getListings: Skipping listing ${doc.id} - status mismatch: expected "${filters.status}", got "${data.status}"`);
          return null;
        }
        
        // Ensure createdAt exists for all listings
        if (!data.createdAt) {
          data.createdAt = new Date().toISOString();
        }
        return { id: doc.id, ...data } as Listing;
      })
      .filter((listing): listing is Listing => listing !== null);
    
    // Sort manually by createdAt (descending) - this avoids needing a composite index
    listings.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending (newest first)
    });
    
    console.log(`getListings: Successfully processed ${listings.length} valid listings out of ${snapshot.docs.length} raw documents`);
    if (filters?.status) {
      console.log(`getListings: Filtered by status "${filters.status}" - found ${listings.length} listings`);
    }
    return listings;
  } catch (error: any) {
    console.error("Error loading listings:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      filters: filters
    });
    throw error;
  }
};

// 📅 Bookings
export const createBooking = async (data: Omit<Booking, 'id' | 'createdAt'>) => {
  // Validate required fields
  if (!data.hostId) {
    throw new Error('Booking must have a hostId');
  }
  if (!data.guestId) {
    throw new Error('Booking must have a guestId');
  }
  if (!data.listingId) {
    throw new Error('Booking must have a listingId');
  }
  
  const bookingData = {
    ...data,
    hostId: String(data.hostId), // Ensure hostId is a string
    guestId: String(data.guestId), // Ensure guestId is a string
    listingId: String(data.listingId), // Ensure listingId is a string
    createdAt: new Date().toISOString(),
    status: data.status || 'pending',
  };
  
  console.log('💾 Creating booking in Firestore:', {
    hostId: bookingData.hostId,
    guestId: bookingData.guestId,
    listingId: bookingData.listingId,
    status: bookingData.status,
    createdAt: bookingData.createdAt
  });
  
  const docRef = await addDoc(collection(db, 'bookings'), bookingData);
  
  console.log('✅ Booking created in Firestore:', {
    id: docRef.id,
    hostId: bookingData.hostId
  });
  
  return docRef.id;
};

export const updateBooking = async (id: string, data: Partial<Booking>) => {
  await updateDoc(doc(db, 'bookings', id), data);
};

export const getBookings = async (filters?: { guestId?: string; hostId?: string; status?: string }) => {
  try {
    let q: any;
    
    // Build query based on filters
    if (filters?.hostId && filters?.status) {
      // Use composite index: hostId + status + createdAt
      q = query(
        collection(db, 'bookings'),
        where('hostId', '==', filters.hostId),
        where('status', '==', filters.status),
        orderBy('createdAt', 'desc')
      );
    } else if (filters?.hostId) {
      // Use composite index: hostId + createdAt
      q = query(
        collection(db, 'bookings'),
        where('hostId', '==', filters.hostId),
        orderBy('createdAt', 'desc')
      );
    } else if (filters?.guestId && filters?.status) {
      // Use composite index: guestId + status + createdAt
      q = query(
        collection(db, 'bookings'),
        where('guestId', '==', filters.guestId),
        where('status', '==', filters.status),
        orderBy('createdAt', 'desc')
      );
    } else if (filters?.guestId) {
      // Use composite index: guestId + createdAt
      q = query(
        collection(db, 'bookings'),
        where('guestId', '==', filters.guestId),
        orderBy('createdAt', 'desc')
      );
    } else if (filters?.status) {
      // Just status filter
      q = query(
        collection(db, 'bookings'),
        where('status', '==', filters.status),
        orderBy('createdAt', 'desc')
      );
    } else {
      // No filters, just order by createdAt
      q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    
    console.log('📊 getBookings query result:', {
      filters,
      count: bookings.length,
      bookings: bookings.map(b => ({ id: b.id, hostId: b.hostId, guestId: b.guestId, status: b.status }))
    });
    
    return bookings;
  } catch (error: any) {
    console.error('❌ Error in getBookings:', error);
    // If query fails due to missing index, try without orderBy as fallback
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Falling back to query without orderBy');
      let q: any = query(collection(db, 'bookings'));
      
      if (filters?.guestId) {
        q = query(q, where('guestId', '==', filters.guestId));
      }
      if (filters?.hostId) {
        q = query(q, where('hostId', '==', filters.hostId));
      }
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      // Sort manually
      bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return bookings;
    }
    throw error;
  }
};

// ⭐ Reviews
export const createReview = async (data: Omit<Review, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'reviews'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getListingReviews = async (listingId: string) => {
  const q = query(
    collection(db, 'reviews'), 
    where('listingId', '==', listingId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
};

// 💬 Messages
export const sendMessage = async (data: Omit<Message, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'messages'), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getMessages = async (userId: string) => {
  const q = query(
    collection(db, 'messages'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
};

// 💳 Transactions
export const createTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...data,
    status: data.status || 'pending', // Default to pending if not specified
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getUserTransactions = async (userId: string) => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
};

// 🖼️ Storage - Using Cloudinary instead of Firebase Storage
export const uploadListingImages = async (files: File[], listingId: string) => {
  // Use Cloudinary for image uploads
  return await uploadToCloudinary(files, listingId);
};

// ❤️ Favorites
export const toggleFavorite = async (userId: string, listingId: string, favorites: string[]) => {
  const newFavorites = favorites.includes(listingId)
    ? favorites.filter(id => id !== listingId)
    : [...favorites, listingId];
  
  await updateDoc(doc(db, 'users', userId), { favorites: newFavorites });
  return newFavorites;
};

// 🌟 Wishlist (separate from favorites - for future plans)
export const toggleWishlist = async (userId: string, listingId: string, wishlist: string[]) => {
  const newWishlist = wishlist.includes(listingId)
    ? wishlist.filter(id => id !== listingId)
    : [...wishlist, listingId];
  
  await updateDoc(doc(db, 'users', userId), { wishlist: newWishlist });
  return newWishlist;
};

// 🔐 OTP Verification Functions
/**
 * Generate a 6-digit OTP code
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create and store OTP for email verification
 * @param userId - Firebase user ID
 * @param email - User email
 * @returns The generated OTP code
 */
export const createOTP = async (userId: string, email: string): Promise<string> => {
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

  const otpData = {
    userId,
    email,
    otp,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    verified: false,
  };

  // Store OTP in Firestore
  await addDoc(collection(db, 'otps'), otpData);
  
  // Clean up old OTPs for this user
  const oldOtpsQuery = query(
    collection(db, 'otps'),
    where('userId', '==', userId),
    where('verified', '==', false)
  );
  const oldOtps = await getDocs(oldOtpsQuery);
  oldOtps.forEach(async (otpDoc) => {
    const data = otpDoc.data();
    const expired = new Date(data.expiresAt) < new Date();
    if (expired) {
      await deleteDoc(doc(db, 'otps', otpDoc.id));
    }
  });

  return otp;
};

/**
 * Verify OTP code
 * @param userId - Firebase user ID
 * @param otpCode - The OTP code entered by user
 * @returns true if OTP is valid, false otherwise
 */
export const verifyOTP = async (userId: string, otpCode: string): Promise<boolean> => {
  try {
    const otpsQuery = query(
      collection(db, 'otps'),
      where('userId', '==', userId),
      where('otp', '==', otpCode),
      where('verified', '==', false)
    );
    
    const querySnapshot = await getDocs(otpsQuery);
    
    if (querySnapshot.empty) {
      return false;
    }

    const otpDoc = querySnapshot.docs[0];
    const otpData = otpDoc.data();

    // Check if OTP is expired
    const expiresAt = new Date(otpData.expiresAt);
    if (expiresAt < new Date()) {
      await deleteDoc(doc(db, 'otps', otpDoc.id));
      return false;
    }

    // Mark OTP as verified
    await updateDoc(doc(db, 'otps', otpDoc.id), {
      verified: true,
      verifiedAt: new Date().toISOString(),
    });

    // Clean up verified OTP
    setTimeout(() => {
      deleteDoc(doc(db, 'otps', otpDoc.id)).catch(console.error);
    }, 5000);

    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

/**
 * Resend OTP (creates a new OTP)
 * @param userId - Firebase user ID
 * @param email - User email
 * @returns The new OTP code
 */
export const resendOTP = async (userId: string, email: string): Promise<string> => {
  return await createOTP(userId, email);
};
