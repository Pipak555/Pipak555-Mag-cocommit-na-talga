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
  serverTimestamp,
  onSnapshot,
  or
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
  try {
    await updateDoc(doc(db, 'listing', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating listing:', error);
    throw new Error(error.message || 'Failed to update listing');
  }
};

export const deleteListing = async (id: string) => {
  await deleteDoc(doc(db, 'listing', id));
};

// Helper function to sanitize listing data - removes promo code fields for non-hosts
export const sanitizeListingForGuest = (listing: any, userId?: string): Listing => {
  if (!userId || listing.hostId === userId) {
    // User is the host or no user provided - return full listing
    return listing as Listing;
  }
  
  // User is not the host - remove promo code fields
  const { promoCode, promoDiscount, promoDescription, promoMaxUses, promo, ...sanitized } = listing;
  return sanitized as Listing;
};

export const getListing = async (id: string, userId?: string) => {
  const docSnap = await getDoc(doc(db, 'listing', id));
  if (docSnap.exists()) {
    const listing = { id: docSnap.id, ...docSnap.data() } as Listing;
    return sanitizeListingForGuest(listing, userId);
  }
  return null;
};

export const getListings = async (filters?: { category?: string; status?: string; hostId?: string }, userId?: string) => {
  try {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log("getListings called with filters:", JSON.stringify(filters));
    }
    
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
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`getListings: Applied filters: [${appliedFilters.join(', ')}]`);
      console.log("getListings: Executing Firestore query...");
    }
    
    // Execute query WITHOUT orderBy (avoids composite index requirement)
    const snapshot = await getDocs(q);
    
    if (import.meta.env.DEV) {
      console.log(`getListings: Query successful, found ${snapshot.docs.length} raw documents`);
    }
    
    // Process and filter documents
    const listings = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const docStatus = data.status;
        const docStatusType = typeof docStatus;
        
        // Only log in development
        if (import.meta.env.DEV) {
          console.log(`getListings: Processing document ${doc.id}:`, { 
            hostId: data.hostId, 
            status: docStatus,
            statusType: docStatusType,
            category: data.category 
          });
        }
        
        // Filter out documents with invalid data (empty strings)
        if (!data.hostId || data.hostId.trim() === '' || 
            !data.status || data.status.trim() === '' ||
            !data.category || data.category.trim() === '') {
          if (import.meta.env.DEV) {
            console.warn(`getListings: Skipping listing ${doc.id} - missing required fields:`, {
              hostId: data.hostId,
              status: data.status,
              statusType: typeof data.status,
              category: data.category
            });
          }
          return null;
        }
        
        // If status filter is set, double-check the status matches (client-side safety check)
        if (filters?.status && filters.status.trim() !== '' && data.status !== filters.status) {
          if (import.meta.env.DEV) {
            console.warn(`getListings: Skipping listing ${doc.id} - status mismatch: expected "${filters.status}", got "${data.status}"`);
          }
          return null;
        }
        
        // Ensure createdAt exists for all listings
        if (!data.createdAt) {
          data.createdAt = new Date().toISOString();
        }
        const listing = { id: doc.id, ...data } as Listing;
        // Sanitize listing for guests (remove promo codes if user is not the host)
        return sanitizeListingForGuest(listing, userId);
      })
      .filter((listing): listing is Listing => listing !== null);
    
    // Sort manually by createdAt (descending) - this avoids needing a composite index
    listings.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending (newest first)
    });
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`getListings: Successfully processed ${listings.length} valid listings out of ${snapshot.docs.length} raw documents`);
      if (filters?.status) {
        console.log(`getListings: Filtered by status "${filters.status}" - found ${listings.length} listings`);
      }
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

export const getBooking = async (id: string): Promise<Booking | null> => {
  try {
    const bookingDoc = await getDoc(doc(db, 'bookings', id));
    if (!bookingDoc.exists()) {
      return null;
    }
    return { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
  } catch (error: any) {
    console.error('Error getting booking:', error);
    throw new Error(error.message || 'Failed to get booking');
  }
};

export const getBookings = async (filters?: { guestId?: string; hostId?: string; status?: string; listingId?: string }) => {
  try {
    let q: any;
    
    // Build query based on filters
    if (filters?.listingId && filters?.status) {
      // Query by listingId and status (for availability checking)
      q = query(
        collection(db, 'bookings'),
        where('listingId', '==', filters.listingId),
        where('status', '==', filters.status)
      );
    } else if (filters?.listingId) {
      // Query by listingId only
      q = query(
        collection(db, 'bookings'),
        where('listingId', '==', filters.listingId)
      );
    } else if (filters?.hostId && filters?.status) {
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
    const bookings = snapshot.docs
      .map(doc => {
        const data = doc.data();
        if (!data) return null;
        return Object.assign({ id: doc.id }, data) as Booking;
      })
      .filter((booking): booking is Booking => booking !== null);
    
    console.log('📊 getBookings query result:', {
      filters,
      count: bookings.length,
      bookings: bookings.map(b => ({ id: b.id, hostId: b.hostId, guestId: b.guestId, status: b.status }))
    });
    
    return bookings;
  } catch (error: any) {
    console.error('❌ Error in getBookings:', error);
    // If query fails due to missing index, try without orderBy as fallback
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.warn('⚠️ Falling back to query without orderBy (index may need to be created)');
      try {
        let q: any = query(collection(db, 'bookings'));
        
        if (filters?.listingId) {
          q = query(q, where('listingId', '==', filters.listingId));
        }
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
        const bookings = snapshot.docs
          .map(doc => {
            const data = doc.data();
            if (!data) return null;
            return Object.assign({ id: doc.id }, data) as Booking;
          })
          .filter((booking): booking is Booking => booking !== null);
        // Sort manually by createdAt descending
        bookings.sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        return bookings;
      } catch (fallbackError: any) {
        console.error('❌ Fallback query also failed:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
};

// ⭐ Reviews
export const createReview = async (data: Omit<Review, 'id' | 'createdAt'>) => {
  // Check if review already exists for this booking and guest
  const existingReview = await getBookingReview(data.bookingId, data.guestId);
  if (existingReview) {
    throw new Error('You have already reviewed this booking');
  }

  const docRef = await addDoc(collection(db, 'reviews'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  
  // Award host points for high rating (5-star reviews)
  try {
    // Get listing to find hostId
    const listingDoc = await getDoc(doc(db, 'listing', data.listingId));
    if (listingDoc.exists()) {
      const listing = listingDoc.data();
      const hostId = listing.hostId;
      
      if (hostId && data.rating === 5) {
        const { awardHostPointsForRating } = await import('./hostPointsService');
        await awardHostPointsForRating(hostId, data.rating, data.bookingId);
      }
    }
  } catch (error) {
    console.error('Error awarding host points for review:', error);
    // Don't fail review creation if points award fails
  }
  
  return docRef.id;
};

export const getListingReviews = async (listingId: string) => {
  try {
    // Try with orderBy first (requires index)
    try {
  const q = query(
    collection(db, 'reviews'), 
    where('listingId', '==', listingId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (orderByError: any) {
      // If orderBy fails (missing index), fallback to query without orderBy
      console.warn('OrderBy query failed, using fallback:', orderByError);
      const q = query(
        collection(db, 'reviews'), 
        where('listingId', '==', listingId)
      );
      const snapshot = await getDocs(q);
      // Sort manually by createdAt
      const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      return reviews.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (error: any) {
    console.error('Error getting listing reviews:', error);
    // Return empty array on error instead of throwing
    return [];
  }
};

// Get review for a specific booking
export const getBookingReview = async (bookingId: string, guestId: string): Promise<Review | null> => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('bookingId', '==', bookingId),
      where('guestId', '==', guestId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const reviewDoc = snapshot.docs[0];
    return { id: reviewDoc.id, ...reviewDoc.data() } as Review;
  } catch (error) {
    console.error('Error getting booking review:', error);
    return null;
  }
};

// Get average rating and review count for a listing
export const getListingRating = async (listingId: string): Promise<{ averageRating: number; reviewCount: number }> => {
  try {
    const reviews = await getListingReviews(listingId);
    if (reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    return { 
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length 
    };
  } catch (error) {
    console.error('Error getting listing rating:', error);
    return { averageRating: 0, reviewCount: 0 };
  }
};

// Get ratings for multiple listings at once (for performance)
export const getListingsRatings = async (listingIds: string[]): Promise<Map<string, { averageRating: number; reviewCount: number }>> => {
  const ratingsMap = new Map<string, { averageRating: number; reviewCount: number }>();
  
  if (listingIds.length === 0) return ratingsMap;
  
  try {
    // Get all reviews for these listings
    const reviewsRef = collection(db, 'reviews');
    const snapshot = await getDocs(reviewsRef);
    const allReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    
    // Filter reviews for these listings and calculate ratings
    const relevantReviews = allReviews.filter(review => listingIds.includes(review.listingId));
    
    // Group by listingId
    const reviewsByListing = new Map<string, Review[]>();
    relevantReviews.forEach(review => {
      const existing = reviewsByListing.get(review.listingId) || [];
      existing.push(review);
      reviewsByListing.set(review.listingId, existing);
    });
    
    // Calculate ratings for each listing
    listingIds.forEach(listingId => {
      const reviews = reviewsByListing.get(listingId) || [];
      if (reviews.length === 0) {
        ratingsMap.set(listingId, { averageRating: 0, reviewCount: 0 });
      } else {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
        ratingsMap.set(listingId, { averageRating, reviewCount: reviews.length });
      }
    });
  } catch (error) {
    console.error('Error getting listings ratings:', error);
    // Return default ratings for all listings
    listingIds.forEach(listingId => {
      ratingsMap.set(listingId, { averageRating: 0, reviewCount: 0 });
    });
  }
  
  return ratingsMap;
};

// 💬 Messages
export const sendMessage = async (data: Omit<Message, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'messages'), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  });
  
  // Send notification to receiver only
  try {
    const { notifyNewMessage } = await import('./notifications');
    const { getUserProfile } = await import('./firestore');
    
    // Get sender name for notification
    const senderProfile = await getUserProfile(data.senderId);
    const senderName = senderProfile?.fullName || senderProfile?.email || 'Someone';
    
    // Send notification to receiver (new message received)
    await notifyNewMessage(data.receiverId, data.senderId, senderName, docRef.id);
  } catch (error) {
    console.error('Error sending message notification:', error);
    // Don't fail message sending if notification fails
  }
  
  return docRef.id;
};

export const getMessages = async (userId: string) => {
  // Fetch messages where user is receiver
  const receivedQuery = query(
    collection(db, 'messages'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  // Fetch messages where user is sender
  const sentQuery = query(
    collection(db, 'messages'),
    where('senderId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const [receivedSnapshot, sentSnapshot] = await Promise.all([
    getDocs(receivedQuery),
    getDocs(sentQuery)
  ]);

  // Combine and deduplicate messages
  const allMessages = [
    ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)),
    ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))
  ];

  // Remove duplicates by message ID
  const uniqueMessages = Array.from(
    new Map(allMessages.map(msg => [msg.id, msg])).values()
  );

  // Sort by createdAt descending
  return uniqueMessages.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

// Get user profile by ID
export const getUserProfile = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Subscribe to messages for real-time updates
export const subscribeToMessages = (
  userId: string,
  callback: (messages: Message[]) => void
) => {
  // Subscribe to received messages
  const receivedQuery = query(
    collection(db, 'messages'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  // Subscribe to sent messages
  const sentQuery = query(
    collection(db, 'messages'),
    where('senderId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  let receivedMessages: Message[] = [];
  let sentMessages: Message[] = [];

  const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
    receivedMessages = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Message));
    combineAndNotify();
  });

  const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
    sentMessages = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Message));
    combineAndNotify();
  });

  const combineAndNotify = () => {
    // Combine and deduplicate
    const allMessages = [...receivedMessages, ...sentMessages];
    const uniqueMessages = Array.from(
      new Map(allMessages.map(msg => [msg.id, msg])).values()
    );
    
    // Sort by createdAt descending
    const sortedMessages = uniqueMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    callback(sortedMessages);
  };

  // Return unsubscribe function
  return () => {
    unsubscribeReceived();
    unsubscribeSent();
  };
};

// Mark messages as read
export const markMessagesAsRead = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    // Get all unread messages where user is receiver and other user is sender
    const unreadQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', userId),
      where('senderId', '==', otherUserId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(unreadQuery);
    
    // Mark all as read
    await Promise.all(
      snapshot.docs.map(doc => 
        updateDoc(doc.ref, { read: true })
      )
    );
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
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
export const toggleWishlist = async (userId: string, listingId: string, wishlist: string[] | any[], recommendations?: string, bookingId?: string, propertyRequirements?: any, desiredAmenities?: string[]) => {
  // Handle both old format (string[]) and new format (WishlistItem[])
  const isOldFormat = wishlist.length > 0 && typeof wishlist[0] === 'string';
  
  if (isOldFormat) {
    // Old format - convert to new format
    const oldWishlist = wishlist as string[];
    if (oldWishlist.includes(listingId)) {
      // Remove from wishlist
      const newWishlist = oldWishlist.filter(id => id !== listingId);
      await updateDoc(doc(db, 'users', userId), { wishlist: newWishlist });
      return newWishlist;
    } else {
      // Add to wishlist with recommendations if provided
      const newItem: any = {
        listingId,
        addedAt: new Date().toISOString(),
        ...(recommendations && { recommendations }),
        ...(bookingId && { addedFromBooking: bookingId }),
        ...(propertyRequirements && Object.keys(propertyRequirements).length > 0 && { propertyRequirements }),
        ...(desiredAmenities && desiredAmenities.length > 0 && { desiredAmenities })
      };
      const newWishlist = [...oldWishlist.map(id => ({ listingId: id, addedAt: new Date().toISOString() })), newItem];
      await updateDoc(doc(db, 'users', userId), { wishlist: newWishlist });
      return newWishlist;
    }
  } else {
    // New format - array of objects
    const wishlistItems = wishlist as any[];
    const existingIndex = wishlistItems.findIndex(item => 
      (typeof item === 'string' ? item === listingId : item.listingId === listingId)
    );
    
    if (existingIndex >= 0) {
      // Remove from wishlist
      const newWishlist = wishlistItems.filter((item, index) => index !== existingIndex);
      await updateDoc(doc(db, 'users', userId), { wishlist: newWishlist });
      return newWishlist;
    } else {
      // Add to wishlist with recommendations if provided
      const newItem: any = {
        listingId,
        addedAt: new Date().toISOString(),
        ...(recommendations && { recommendations }),
        ...(bookingId && { addedFromBooking: bookingId }),
        ...(propertyRequirements && Object.keys(propertyRequirements).length > 0 && { propertyRequirements }),
        ...(desiredAmenities && desiredAmenities.length > 0 && { desiredAmenities })
      };
      const newWishlist = [...wishlistItems, newItem];
      await updateDoc(doc(db, 'users', userId), { wishlist: newWishlist });
      return newWishlist;
    }
  }
};

// Update wishlist item recommendations
export const updateWishlistRecommendations = async (userId: string, listingId: string, recommendations: string, wishlist: any[]) => {
  const wishlistItems = wishlist.map(item => {
    if (typeof item === 'string') {
      // Old format - convert to new format
      if (item === listingId) {
        return {
          listingId: item,
          recommendations,
          addedAt: new Date().toISOString()
        };
      }
      return { listingId: item, addedAt: new Date().toISOString() };
    } else {
      // New format
      if (item.listingId === listingId) {
        return { ...item, recommendations };
      }
      return item;
    }
  });
  
  await updateDoc(doc(db, 'users', userId), { wishlist: wishlistItems });
  return wishlistItems;
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
