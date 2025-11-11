/**
 * Availability Utilities
 * 
 * Functions to check if listings are available for specific date ranges
 */

import type { Listing, Booking } from '@/types';

/**
 * Check if a date is within a date range (inclusive)
 */
function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const dateTime = date.getTime();
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  return dateTime >= startTime && dateTime <= endTime;
}

/**
 * Generate all dates in a range (inclusive)
 */
function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Check if a listing is available for a specific date range
 * 
 * @param listing - The listing to check
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @param confirmedBookings - Array of confirmed bookings for this listing (optional, for more accurate checking)
 * @returns true if the listing is available for the entire date range
 */
export function isListingAvailableForDates(
  listing: Listing,
  checkIn: Date,
  checkOut: Date,
  confirmedBookings: Booking[] = []
): boolean {
  // Normalize dates (set to midnight)
  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);
  
  const checkOutDate = new Date(checkOut);
  checkOutDate.setHours(0, 0, 0, 0);
  
  // Validate date range
  if (checkOutDate <= checkInDate) {
    return false;
  }
  
  // Generate all dates in the requested range
  const requestedDates = generateDateRange(checkInDate, checkOutDate);
  
  // Check each date in the range
  for (const date of requestedDates) {
    const dateStr = date.toISOString().split('T')[0];
    
    // 1. Check if date is blocked
    if (listing.blockedDates && listing.blockedDates.includes(dateStr)) {
      return false;
    }
    
    // 2. Check if listing has availableDates specified
    if (listing.availableDates && listing.availableDates.length > 0) {
      // If availableDates is specified, date must be in the list
      if (!listing.availableDates.includes(dateStr)) {
        return false;
      }
    }
    
    // 3. Check if date is already booked (if bookings are provided)
    if (confirmedBookings.length > 0) {
      const isBooked = confirmedBookings.some(booking => {
        const bookingCheckIn = new Date(booking.checkIn);
        bookingCheckIn.setHours(0, 0, 0, 0);
        
        const bookingCheckOut = new Date(booking.checkOut);
        bookingCheckOut.setHours(0, 0, 0, 0);
        
        // Check if the date falls within any confirmed booking
        return isDateInRange(date, bookingCheckIn, bookingCheckOut);
      });
      
      if (isBooked) {
        return false;
      }
    }
  }
  
  // All dates in the range are available
  return true;
}

/**
 * Check if a listing is available for at least one date in a range
 * (Less strict - useful for showing listings that might have partial availability)
 */
export function hasPartialAvailability(
  listing: Listing,
  checkIn: Date,
  checkOut: Date,
  confirmedBookings: Booking[] = []
): boolean {
  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);
  
  const checkOutDate = new Date(checkOut);
  checkOutDate.setHours(0, 0, 0, 0);
  
  if (checkOutDate <= checkInDate) {
    return false;
  }
  
  const requestedDates = generateDateRange(checkInDate, checkOutDate);
  
  // Check if at least one date is available
  for (const date of requestedDates) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Skip if blocked
    if (listing.blockedDates && listing.blockedDates.includes(dateStr)) {
      continue;
    }
    
    // Check availableDates if specified
    if (listing.availableDates && listing.availableDates.length > 0) {
      if (!listing.availableDates.includes(dateStr)) {
        continue;
      }
    }
    
    // Check if booked
    if (confirmedBookings.length > 0) {
      const isBooked = confirmedBookings.some(booking => {
        const bookingCheckIn = new Date(booking.checkIn);
        bookingCheckIn.setHours(0, 0, 0, 0);
        
        const bookingCheckOut = new Date(booking.checkOut);
        bookingCheckOut.setHours(0, 0, 0, 0);
        
        return isDateInRange(date, bookingCheckIn, bookingCheckOut);
      });
      
      if (isBooked) {
        continue;
      }
    }
    
    // At least one date is available
    return true;
  }
  
  return false;
}

