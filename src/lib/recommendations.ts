import { getDocs, collection, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Listing, Booking } from '@/types';

/**
 * Get personalized recommendations for a guest based on their booking history
 */
export const getRecommendations = async (userId: string, limit: number = 6): Promise<Listing[]> => {
  try {
    // Get user's booking history
    const bookingsSnapshot = await getDocs(
      query(collection(db, 'bookings'), where('guestId', '==', userId))
    );

    if (bookingsSnapshot.empty) {
      // If no booking history, return popular/featured listings
      return getPopularListings(limit);
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
        bookedListings.push({ id: listingDoc.id, ...listingDoc.data() } as Listing);
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
      .map(doc => ({ id: doc.id, ...doc.data() } as Listing))
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
    return getPopularListings(limit);
  }
};

/**
 * Get popular/featured listings (fallback when no booking history)
 */
const getPopularListings = async (limit: number): Promise<Listing[]> => {
  try {
    const listingsSnapshot = await getDocs(
      query(collection(db, 'listing'), where('status', '==', 'approved'))
    );

    const listings = listingsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Listing))
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
  limit: number = 4
): Promise<Listing[]> => {
  try {
    const listingDoc = await getDoc(doc(db, 'listing', listingId));
    if (!listingDoc.exists()) return [];

    const currentListing = { id: listingDoc.id, ...listingDoc.data() } as Listing;

    const listingsSnapshot = await getDocs(
      query(collection(db, 'listing'), where('status', '==', 'approved'))
    );

    const similarListings = listingsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Listing))
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

