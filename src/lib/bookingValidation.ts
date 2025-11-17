/**
 * Booking Validation Utilities
 * 
 * Functions to validate bookings and prevent duplicates/conflicts
 */

import type { Booking } from '@/types';
import { getBookings } from './firestore';

/**
 * Check if two date ranges overlap
 * Two date ranges overlap if: start1 < end2 AND end1 > start2
 */
function doDateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  const start1Time = new Date(start1).setHours(0, 0, 0, 0);
  const end1Time = new Date(end1).setHours(0, 0, 0, 0);
  const start2Time = new Date(start2).setHours(0, 0, 0, 0);
  const end2Time = new Date(end2).setHours(0, 0, 0, 0);
  
  return start1Time < end2Time && end1Time > start2Time;
}

/**
 * Check if a guest has a pending booking for a specific listing
 * 
 * @param guestId - The guest's user ID
 * @param listingId - The listing ID to check
 * @returns Promise<Booking | null> - The pending booking if found, null otherwise
 */
export async function getPendingBookingForGuest(
  guestId: string,
  listingId: string
): Promise<Booking | null> {
  try {
    const bookings = await getBookings({ 
      guestId, 
      listingId, 
      status: 'pending' 
    });
    
    // Return the first pending booking found (there should only be one)
    return bookings.length > 0 ? bookings[0] : null;
  } catch (error) {
    console.error('Error checking for pending booking:', error);
    return null;
  }
}

/**
 * Check if there are any overlapping bookings (confirmed or pending) for a listing
 * 
 * @param listingId - The listing ID to check
 * @param checkIn - Check-in date for the new booking
 * @param checkOut - Check-out date for the new booking
 * @param excludeBookingId - Optional booking ID to exclude from the check (for updates)
 * @returns Promise<Booking[]> - Array of overlapping bookings
 */
export async function getOverlappingBookings(
  listingId: string,
  checkIn: Date | string,
  checkOut: Date | string,
  excludeBookingId?: string
): Promise<Booking[]> {
  try {
    // Get all bookings for this listing (both confirmed and pending)
    const allBookings = await getBookings({ listingId });
    
    const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
    const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;
    
    // Filter for overlapping bookings
    const overlapping = allBookings.filter(booking => {
      // Exclude the booking being updated
      if (excludeBookingId && booking.id === excludeBookingId) {
        return false;
      }
      
      // Only check confirmed and pending bookings (ignore cancelled and completed)
      if (booking.status !== 'confirmed' && booking.status !== 'pending') {
        return false;
      }
      
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);
      
      return doDateRangesOverlap(
        checkInDate,
        checkOutDate,
        bookingCheckIn,
        bookingCheckOut
      );
    });
    
    return overlapping;
  } catch (error) {
    console.error('Error checking for overlapping bookings:', error);
    return [];
  }
}

/**
 * Validate if a booking can be created
 * 
 * @param guestId - The guest's user ID
 * @param listingId - The listing ID
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @returns Promise<{ valid: boolean; error?: string }> - Validation result
 */
export async function validateBookingCreation(
  guestId: string,
  listingId: string,
  checkIn: Date | string,
  checkOut: Date | string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check 1: Guest must not have a pending booking for the same listing
    const pendingBooking = await getPendingBookingForGuest(guestId, listingId);
    if (pendingBooking) {
      return {
        valid: false,
        error: 'You already have a pending booking request for this listing. Please wait for the host to respond to your previous request before making a new one.'
      };
    }
    
    // Check 2: No overlapping bookings (confirmed or pending) should exist
    const overlappingBookings = await getOverlappingBookings(
      listingId,
      checkIn,
      checkOut
    );
    
    if (overlappingBookings.length > 0) {
      // Check if any are confirmed
      const confirmedOverlaps = overlappingBookings.filter(b => b.status === 'confirmed');
      if (confirmedOverlaps.length > 0) {
        return {
          valid: false,
          error: 'The selected dates are already booked. Please choose different dates.'
        };
      }
      
      // Check if any are pending
      const pendingOverlaps = overlappingBookings.filter(b => b.status === 'pending');
      if (pendingOverlaps.length > 0) {
        return {
          valid: false,
          error: 'The selected dates have pending booking requests. Please choose different dates or wait for the pending requests to be resolved.'
        };
      }
    }
    
    return { valid: true };
  } catch (error: any) {
    console.error('Error validating booking:', error);
    return {
      valid: false,
      error: 'An error occurred while validating the booking. Please try again.'
    };
  }
}

