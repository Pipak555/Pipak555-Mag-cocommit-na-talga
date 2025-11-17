import { getDocs, collection, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Listing, Booking } from '@/types';
import { sanitizeListingForGuest } from './firestore';

/**
 * Get personalized recommendations for Guest Dashboard STRICTLY based on booking history
 * Returns empty array if no booking history exists (no generic/random recommendations)
 */
export const getGuestDashboardRecommendations = async (userId: string, limit: number = 6): Promise<Listing[]> => {
  try {
    // Get user's booking history - only confirmed and completed bookings count
    const bookingsSnapshot = await getDocs(
      query(collection(db, 'bookings'), where('guestId', '==', userId))
    );

    // STRICT: If no booking history, return empty array (no generic recommendations)
    if (bookingsSnapshot.empty) {
      return [];
    }

    const allBookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    
    // Filter to only confirmed and completed bookings for analysis
    const validBookings = allBookings.filter(b => 
      b.status === 'confirmed' || b.status === 'completed'
    );

    // If no valid bookings, return empty
    if (validBookings.length === 0) {
      return [];
    }

    // Get details of booked listings
    const bookedListingIds = validBookings.map(b => b.listingId);
    const bookedListings: Listing[] = [];
    const bookingMap = new Map<string, Booking[]>(); // Map listingId to bookings
    
    for (const booking of validBookings) {
      if (!bookingMap.has(booking.listingId)) {
        bookingMap.set(booking.listingId, []);
      }
      bookingMap.get(booking.listingId)!.push(booking);
      
      // Get listing details if not already fetched
      if (!bookedListings.find(l => l.id === booking.listingId)) {
        const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
        if (listingDoc.exists()) {
          const listing = { id: listingDoc.id, ...listingDoc.data() } as Listing;
          bookedListings.push(sanitizeListingForGuest(listing, userId));
        }
      }
    }

    // Analyze booking patterns and preferences
    const preferences = analyzeBookingPreferences(validBookings, bookedListings, bookingMap);

    // Find similar listings
    const allListingsSnapshot = await getDocs(
      query(collection(db, 'listing'), where('status', '==', 'approved'))
    );

    const allListings = allListingsSnapshot.docs
      .map(doc => {
        const listing = { id: doc.id, ...doc.data() } as Listing;
        return sanitizeListingForGuest(listing, userId);
      })
      .filter(l => !bookedListingIds.includes(l.id)); // Exclude already booked

    // Score and rank listings based on booking history patterns
    const scoredListings = allListings.map(listing => {
      return {
        listing,
        score: calculateRecommendationScore(listing, preferences)
      };
    });

    // Sort by score and return top recommendations
    const recommendations = scoredListings
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0) // Only return listings with positive scores
      .slice(0, limit)
      .map(item => item.listing);

    return recommendations;

  } catch (error) {
    console.error('Error getting guest dashboard recommendations:', error);
    // Return empty array on error (strict - no fallback)
    return [];
  }
};

/**
 * Analyze booking history to extract guest preferences
 */
function analyzeBookingPreferences(
  bookings: Booking[],
  bookedListings: Listing[],
  bookingMap: Map<string, Booking[]>
) {
  // Category preferences (with frequency weighting)
  const categoryFrequency = new Map<string, number>();
  bookedListings.forEach(listing => {
    const count = bookingMap.get(listing.id)?.length || 1;
    categoryFrequency.set(
      listing.category,
      (categoryFrequency.get(listing.category) || 0) + count
    );
  });

  // Location preferences (with frequency and city/region extraction)
  const locationFrequency = new Map<string, number>();
  const locationParts = new Set<string>(); // City names, regions, etc.
  
  bookedListings.forEach(listing => {
    const count = bookingMap.get(listing.id)?.length || 1;
    const location = listing.location.toLowerCase();
    locationFrequency.set(location, (locationFrequency.get(location) || 0) + count);
    
    // Extract location parts (city, region, etc.)
    const parts = location.split(',').map(p => p.trim());
    parts.forEach(part => {
      if (part.length > 2) {
        locationParts.add(part);
      }
    });
  });

  // Price analysis (considering actual booking prices, not just listing prices)
  const bookingPrices = bookings.map(b => b.totalPrice);
  const avgPrice = bookingPrices.reduce((sum, p) => sum + p, 0) / bookingPrices.length;
  const minPrice = Math.min(...bookingPrices);
  const maxPrice = Math.max(...bookingPrices);
  
  // Price range based on actual spending patterns
  const priceRange = {
    min: Math.max(0, avgPrice * 0.6), // 40% below average
    max: avgPrice * 1.6, // 60% above average
    preferred: avgPrice, // Most common price point
  };

  // Amenity preferences (from home listings)
  const amenityFrequency = new Map<string, number>();
  bookedListings
    .filter(l => l.category === 'home' && l.amenities)
    .forEach(listing => {
      const count = bookingMap.get(listing.id)?.length || 1;
      listing.amenities!.forEach(amenity => {
        amenityFrequency.set(
          amenity.toLowerCase(),
          (amenityFrequency.get(amenity.toLowerCase()) || 0) + count
        );
      });
    });

  // Date/seasonal patterns (analyze booking months)
  const monthFrequency = new Map<number, number>();
  bookings.forEach(booking => {
    const checkIn = new Date(booking.checkIn);
    const month = checkIn.getMonth(); // 0-11
    monthFrequency.set(month, (monthFrequency.get(month) || 0) + 1);
  });

  // Property type preferences (for homes)
  const houseTypeFrequency = new Map<string, number>();
  bookedListings
    .filter(l => l.category === 'home' && l.houseType)
    .forEach(listing => {
      const count = bookingMap.get(listing.id)?.length || 1;
      houseTypeFrequency.set(
        listing.houseType!.toLowerCase(),
        (houseTypeFrequency.get(listing.houseType!.toLowerCase()) || 0) + count
      );
    });

  // Guest capacity preferences
  const guestCounts = bookings.map(b => b.guests);
  const avgGuests = guestCounts.reduce((sum, g) => sum + g, 0) / guestCounts.length;
  const preferredGuests = Math.round(avgGuests);

  return {
    categoryFrequency,
    locationFrequency,
    locationParts,
    priceRange,
    amenityFrequency,
    monthFrequency,
    houseTypeFrequency,
    preferredGuests,
    totalBookings: bookings.length,
  };
}

/**
 * Calculate recommendation score for a listing based on guest preferences
 */
function calculateRecommendationScore(
  listing: Listing,
  preferences: ReturnType<typeof analyzeBookingPreferences>
): number {
  let score = 0;

  // Category match (weighted by frequency)
  const categoryCount = preferences.categoryFrequency.get(listing.category) || 0;
  if (categoryCount > 0) {
    // Higher weight for frequently booked categories
    score += 3 + (categoryCount * 0.5); // Base 3, +0.5 per booking
  }

  // Location match (weighted by frequency and partial matches)
  const exactLocationCount = preferences.locationFrequency.get(listing.location.toLowerCase()) || 0;
  if (exactLocationCount > 0) {
    score += 4 + (exactLocationCount * 0.5); // Strong match for exact location
  } else {
    // Partial location match (city, region, etc.)
    const listingLocation = listing.location.toLowerCase();
    let locationMatch = false;
    preferences.locationParts.forEach(part => {
      if (listingLocation.includes(part) || part.includes(listingLocation.split(',')[0])) {
        locationMatch = true;
        score += 2; // Partial match
      }
    });
  }

  // Price range match (considering actual booking prices)
  const listingPrice = listing.price || listing.servicePrice || 0;
  if (listingPrice >= preferences.priceRange.min && listingPrice <= preferences.priceRange.max) {
    score += 2;
    
    // Bonus for being close to preferred price
    const priceDiff = Math.abs(listingPrice - preferences.priceRange.preferred) / preferences.priceRange.preferred;
    if (priceDiff <= 0.2) {
      score += 1; // Very close to preferred price
    }
  }

  // Amenity match (for home listings)
  if (listing.category === 'home' && listing.amenities && preferences.amenityFrequency.size > 0) {
    let amenityMatches = 0;
    listing.amenities.forEach(amenity => {
      const amenityCount = preferences.amenityFrequency.get(amenity.toLowerCase()) || 0;
      if (amenityCount > 0) {
        amenityMatches++;
        score += 0.5 + (amenityCount * 0.1); // Base 0.5 per match, +0.1 per booking
      }
    });
    
    // Bonus for having many preferred amenities
    if (amenityMatches >= 3) {
      score += 1;
    }
  }

  // House type match (for home listings)
  if (listing.category === 'home' && listing.houseType) {
    const houseTypeCount = preferences.houseTypeFrequency.get(listing.houseType.toLowerCase()) || 0;
    if (houseTypeCount > 0) {
      score += 1 + (houseTypeCount * 0.3);
    }
  }

  // Guest capacity match (for homes and experiences)
  if (listing.category === 'home' && listing.maxGuests) {
    const capacityDiff = Math.abs(listing.maxGuests - preferences.preferredGuests);
    if (capacityDiff <= 2) {
      score += 1; // Close to preferred capacity
    }
  } else if (listing.category === 'experience' && listing.capacity) {
    const capacityDiff = Math.abs(listing.capacity - preferences.preferredGuests);
    if (capacityDiff <= 2) {
      score += 1;
    }
  }

  // Seasonal preference (if booking is in a preferred month)
  const currentMonth = new Date().getMonth();
  const currentMonthCount = preferences.monthFrequency.get(currentMonth) || 0;
  if (currentMonthCount > 0) {
    score += 0.5; // Slight boost for seasonal preference
  }

  return score;
}

/**
 * Get personalized recommendations for a guest based on their booking history
 * @deprecated Use getGuestDashboardRecommendations for Guest Dashboard (strict booking-based)
 * This function is kept for backward compatibility but falls back to popular listings
 */
export const getRecommendations = async (userId: string, limit: number = 6): Promise<Listing[]> => {
  try {
    // Get user's booking history
    const bookingsSnapshot = await getDocs(
      query(collection(db, 'bookings'), where('guestId', '==', userId))
    );

    if (bookingsSnapshot.empty) {
      // If no booking history, return popular/featured listings
      return getPopularListings(limit, userId);
    }

    const bookings = bookingsSnapshot.docs.map(doc => doc.data() as Booking);
    
    // Extract patterns from booking history
    const bookedCategories = [...new Set(bookings.map(b => {
      // Get listing category from booking
      return b.listingId;
    }))];

    // Get details of booked listings
    const bookedListingIds = bookings.map(b => b.listingId);
    const bookedListings: Listing[] = [];
    
    for (const listingId of bookedListingIds) {
      const listingDoc = await getDoc(doc(db, 'listing', listingId));
      if (listingDoc.exists()) {
        const listing = { id: listingDoc.id, ...listingDoc.data() } as Listing;
        // Sanitize listing for guests (remove promo codes if user is not the host)
        bookedListings.push(sanitizeListingForGuest(listing, userId));
      }
    }

    // Analyze preferences
    const categories = bookedListings.map(l => l.category);
    const locations = bookedListings.map(l => l.location.toLowerCase());
    const avgPrice = bookedListings.reduce((sum, l) => sum + l.price, 0) / bookedListings.length;
    const priceRange = {
      min: avgPrice * 0.7, // 30% below average
      max: avgPrice * 1.5, // 50% above average
    };

    // Find similar listings
    const allListingsSnapshot = await getDocs(
      query(collection(db, 'listing'), where('status', '==', 'approved'))
    );

    const allListings = allListingsSnapshot.docs
      .map(doc => {
        const listing = { id: doc.id, ...doc.data() } as Listing;
        // Sanitize listing for guests (remove promo codes if user is not the host)
        return sanitizeListingForGuest(listing, userId);
      })
      .filter(l => !bookedListingIds.includes(l.id)); // Exclude already booked

    // Score and rank listings
    const scoredListings = allListings.map(listing => {
      let score = 0;

      // Category match (higher weight)
      if (categories.includes(listing.category)) {
        score += 3;
      }

      // Location similarity
      const listingLocation = listing.location.toLowerCase();
      locations.forEach(loc => {
        if (listingLocation.includes(loc.split(',')[0]) || loc.includes(listingLocation.split(',')[0])) {
          score += 2;
        }
      });

      // Price range match
      if (listing.price >= priceRange.min && listing.price <= priceRange.max) {
        score += 1;
      }

      // High ratings boost
      if (listing.images && listing.images.length > 3) {
        score += 0.5; // More images = better listing
      }

      return { listing, score };
    });

    // Sort by score and return top recommendations
    return scoredListings
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.listing);

  } catch (error) {
    console.error('Error getting recommendations:', error);
    // Fallback to popular listings
    return getPopularListings(limit, userId);
  }
};

/**
 * Get popular/featured listings (fallback when no booking history)
 */
const getPopularListings = async (limit: number, userId?: string): Promise<Listing[]> => {
  try {
    const listingsSnapshot = await getDocs(
      query(collection(db, 'listing'), where('status', '==', 'approved'))
    );

    const listings = listingsSnapshot.docs
      .map(doc => {
        const listing = { id: doc.id, ...doc.data() } as Listing;
        // Sanitize listing for guests (remove promo codes if user is not the host)
        return sanitizeListingForGuest(listing, userId);
      })
      .sort((a, b) => {
        // Sort by creation date (newest first) as a simple popularity metric
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);

    return listings;
  } catch (error) {
    console.error('Error getting popular listings:', error);
    return [];
  }
};

/**
 * Get recommendations based on specific listing (similar listings)
 */
export const getSimilarListings = async (
  listingId: string,
  limit: number = 4,
  userId?: string
): Promise<Listing[]> => {
  try {
    const listingDoc = await getDoc(doc(db, 'listing', listingId));
    if (!listingDoc.exists()) return [];

    const listingData = { id: listingDoc.id, ...listingDoc.data() } as Listing;
    // Sanitize current listing for guests (remove promo codes if user is not the host)
    const currentListing = sanitizeListingForGuest(listingData, userId);

    const listingsSnapshot = await getDocs(
      query(collection(db, 'listing'), where('status', '==', 'approved'))
    );

    const similarListings = listingsSnapshot.docs
      .map(doc => {
        const listing = { id: doc.id, ...doc.data() } as Listing;
        // Sanitize listing for guests (remove promo codes if user is not the host)
        return sanitizeListingForGuest(listing, userId);
      })
      .filter(l => l.id !== listingId)
      .map(listing => {
        let score = 0;

        // Same category
        if (listing.category === currentListing.category) {
          score += 3;
        }

        // Similar location
        const currentLoc = currentListing.location.toLowerCase();
        const listingLoc = listing.location.toLowerCase();
        if (listingLoc.includes(currentLoc.split(',')[0]) || currentLoc.includes(listingLoc.split(',')[0])) {
          score += 2;
        }

        // Similar price range (within 30%)
        const priceDiff = Math.abs(listing.price - currentListing.price) / currentListing.price;
        if (priceDiff <= 0.3) {
          score += 1;
        }

        return { listing, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.listing);

    return similarListings;
  } catch (error) {
    console.error('Error getting similar listings:', error);
    return [];
  }
};

