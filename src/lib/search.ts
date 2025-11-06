import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from './firebase';
import type { Listing } from '@/types';

export interface SearchFilters {
  query?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxGuests?: number;
  amenities?: string[];
  status?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest' | 'oldest';
  limit?: number;
}

export interface SearchResult {
  listings: Listing[];
  total: number;
  hasMore: boolean;
}

/**
 * Advanced search with Firestore queries
 * 
 * Performs comprehensive listing search with:
 * - Text search (title, location, description, category)
 * - Price range filtering
 * - Rating filtering
 * - Guest capacity filtering
 * - Category filtering
 * - Multiple sorting options
 * 
 * Note: Some filters are applied client-side for flexibility.
 * For production with large datasets, consider using Algolia or similar.
 * 
 * @param filters - Search filters including query, price range, rating, etc.
 * @returns SearchResult with listings, total count, and pagination info
 * @throws Error if search fails
 */
export const searchListings = async (filters: SearchFilters = {}): Promise<SearchResult> => {
  try {
    // Start with base query
    let q: any = query(collection(db, 'listing'));

    // Apply status filter first (most common)
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    } else {
      // Default to approved listings
      q = query(q, where('status', '==', 'approved'));
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category));
    }

    // Execute base query
    const snapshot = await getDocs(q);
    let listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Listing));

    // Client-side filtering for fields that don't support Firestore queries
    if (filters.location) {
      const lowerLocation = filters.location.toLowerCase();
      listings = listings.filter(listing =>
        listing.location.toLowerCase().includes(lowerLocation)
      );
    }

    if (filters.minPrice !== undefined) {
      listings = listings.filter(listing => listing.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      listings = listings.filter(listing => listing.price <= filters.maxPrice!);
    }

    if (filters.maxGuests !== undefined) {
      listings = listings.filter(listing => listing.maxGuests >= filters.maxGuests!);
    }

    if (filters.minRating !== undefined) {
      listings = listings.filter(listing => {
        const rating = listing.averageRating || 0;
        return rating >= filters.minRating!;
      });
    }

    // Text search (client-side)
    if (filters.query) {
      const lowerQuery = filters.query.toLowerCase();
      listings = listings.filter(listing => {
        const matchesTitle = listing.title.toLowerCase().includes(lowerQuery);
        const matchesLocation = listing.location.toLowerCase().includes(lowerQuery);
        const matchesDescription = listing.description.toLowerCase().includes(lowerQuery);
        const matchesCategory = listing.category.toLowerCase().includes(lowerQuery);
        return matchesTitle || matchesLocation || matchesDescription || matchesCategory;
      });

      // Sort by relevance for text search
      listings.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 3 : 0;
        const aLocation = a.location.toLowerCase().includes(lowerQuery) ? 2 : 0;
        const aDesc = a.description.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const aScore = aTitle + aLocation + aDesc;

        const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 3 : 0;
        const bLocation = b.location.toLowerCase().includes(lowerQuery) ? 2 : 0;
        const bDesc = b.description.toLowerCase().includes(lowerQuery) ? 1 : 0;
        const bScore = bTitle + bLocation + bDesc;

        return bScore - aScore;
      });
    } else {
      // Apply sorting
      switch (filters.sortBy) {
        case 'price_asc':
          listings.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          listings.sort((a, b) => b.price - a.price);
          break;
        case 'rating_desc':
          listings.sort((a, b) => {
            const aRating = a.averageRating || 0;
            const bRating = b.averageRating || 0;
            return bRating - aRating;
          });
          break;
        case 'oldest':
          listings.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateA - dateB;
          });
          break;
        case 'newest':
        default:
          listings.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          break;
      }
    }

    const total = listings.length;
    const limit = filters.limit || 50;
    const hasMore = total > limit;

    // Apply limit
    const limitedListings = listings.slice(0, limit);

    return {
      listings: limitedListings,
      total,
      hasMore
    };
  } catch (error) {
    console.error('Error searching listings:', error);
    throw error;
  }
};

/**
 * Get popular listings (by rating and review count)
 */
export const getPopularListings = async (limitCount: number = 10): Promise<Listing[]> => {
  try {
    const result = await searchListings({
      status: 'approved',
      sortBy: 'rating_desc',
      limit: limitCount
    });
    return result.listings;
  } catch (error) {
    console.error('Error getting popular listings:', error);
    return [];
  }
};

/**
 * Get trending listings (recent with high ratings)
 */
export const getTrendingListings = async (limitCount: number = 10): Promise<Listing[]> => {
  try {
    const result = await searchListings({
      status: 'approved',
      minRating: 4.0,
      sortBy: 'newest',
      limit: limitCount
    });
    return result.listings;
  } catch (error) {
    console.error('Error getting trending listings:', error);
    return [];
  }
};

/**
 * Get budget-friendly listings
 */
export const getBudgetListings = async (maxPrice: number, limitCount: number = 10): Promise<Listing[]> => {
  try {
    const result = await searchListings({
      status: 'approved',
      maxPrice,
      sortBy: 'price_asc',
      limit: limitCount
    });
    return result.listings;
  } catch (error) {
    console.error('Error getting budget listings:', error);
    return [];
  }
};

