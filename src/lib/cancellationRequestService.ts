import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { CancellationRequest, Booking } from '@/types';
import { updateBooking } from './firestore';
import { processBookingRefund } from './paymentService';
import { notifyBookingCancelled, notifyCancellationRequestCreated, notifyCancellationRequestReviewed } from './notifications';

/**
 * Create a cancellation request for a booking
 */
export const createCancellationRequest = async (
  bookingId: string,
  reason?: string
): Promise<string> => {
  try {
    // Get booking details
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

    // Validate booking can be cancelled
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new Error('This booking cannot be cancelled');
    }

    // Check if there's already a pending cancellation request
    if (booking.cancellationRequestId) {
      const existingRequestDoc = await getDoc(doc(db, 'cancellationRequests', booking.cancellationRequestId));
      if (existingRequestDoc.exists()) {
        const existingRequest = existingRequestDoc.data() as CancellationRequest;
        if (existingRequest.status === 'pending') {
          throw new Error('A cancellation request is already pending for this booking');
        }
      }
    }

    // Create cancellation request
    const requestData: Omit<CancellationRequest, 'id'> = {
      bookingId: booking.id,
      guestId: booking.guestId,
      hostId: booking.hostId,
      listingId: booking.listingId,
      reason: reason || undefined,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    const requestRef = await addDoc(collection(db, 'cancellationRequests'), requestData);
    const requestId = requestRef.id;

    // Update booking with cancellation request ID
    await updateBooking(bookingId, { cancellationRequestId: requestId });

    // Send notification to admin
    try {
      await notifyCancellationRequestCreated(bookingId, booking.guestId, booking.hostId);
    } catch (notificationError) {
      console.error('Error sending cancellation request notification:', notificationError);
      // Don't fail the request creation if notification fails
    }

    return requestId;
  } catch (error: any) {
    console.error('Error creating cancellation request:', error);
    throw new Error(error.message || 'Failed to create cancellation request');
  }
};

/**
 * Get cancellation request by ID
 */
export const getCancellationRequest = async (requestId: string): Promise<CancellationRequest | null> => {
  try {
    const requestDoc = await getDoc(doc(db, 'cancellationRequests', requestId));
    if (!requestDoc.exists()) {
      return null;
    }
    return { id: requestDoc.id, ...requestDoc.data() } as CancellationRequest;
  } catch (error: any) {
    console.error('Error getting cancellation request:', error);
    throw new Error(error.message || 'Failed to get cancellation request');
  }
};

/**
 * Get all cancellation requests (with optional filters)
 */
export const getCancellationRequests = async (filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  guestId?: string;
  hostId?: string;
}): Promise<CancellationRequest[]> => {
  try {
    let q = query(collection(db, 'cancellationRequests'), orderBy('requestedAt', 'desc'));

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.guestId) {
      q = query(q, where('guestId', '==', filters.guestId));
    }
    if (filters?.hostId) {
      q = query(q, where('hostId', '==', filters.hostId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CancellationRequest));
  } catch (error: any) {
    console.error('Error getting cancellation requests:', error);
    throw new Error(error.message || 'Failed to get cancellation requests');
  }
};

/**
 * Subscribe to cancellation requests in real-time
 */
export const subscribeToCancellationRequests = (
  callback: (requests: CancellationRequest[]) => void,
  filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    guestId?: string;
    hostId?: string;
  }
) => {
  let q = query(collection(db, 'cancellationRequests'), orderBy('requestedAt', 'desc'));

  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.guestId) {
    q = query(q, where('guestId', '==', filters.guestId));
  }
  if (filters?.hostId) {
    q = query(q, where('hostId', '==', filters.hostId));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CancellationRequest));
      callback(requests);
    },
    (error) => {
      console.error('Error in cancellation requests subscription:', error);
      callback([]);
    }
  );
};

/**
 * Approve a cancellation request
 * This will:
 * 1. Update the cancellation request status to 'approved'
 * 2. Update the booking status to 'cancelled'
 * 3. Process the refund automatically
 * 4. Send notifications
 */
export const approveCancellationRequest = async (
  requestId: string,
  adminId: string,
  adminNotes?: string
): Promise<void> => {
  try {
    // Get cancellation request
    const request = await getCancellationRequest(requestId);
    if (!request) {
      throw new Error('Cancellation request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cancellation request is already ${request.status}`);
    }

    // Get booking
    const bookingDoc = await getDoc(doc(db, 'bookings', request.bookingId));
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }
    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

    // Update cancellation request
    await updateDoc(doc(db, 'cancellationRequests', requestId), {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminId,
      adminNotes: adminNotes || undefined,
    });

    // Update booking status to cancelled
    await updateBooking(request.bookingId, { 
      status: 'cancelled',
      cancellationRequestId: requestId
    });

    // Process refund automatically
    try {
      const refundResult = await processBookingRefund(booking, 'guest', request.reason);
      if (!refundResult.success) {
        console.error('Refund processing failed:', refundResult);
        // Don't throw - the cancellation is still processed, but refund failed
      }
    } catch (refundError: any) {
      console.error('Error processing refund:', refundError);
      // Don't throw - the cancellation is still processed, but refund failed
    }

    // Send notifications
    try {
      // Get listing title for notification
      const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
      const listingTitle = listingDoc.exists() ? listingDoc.data().title : 'Your booking';

      // Notify guest and host about cancellation
      await notifyBookingCancelled(booking.guestId, booking.id, listingTitle, 'admin');
      await notifyBookingCancelled(booking.hostId, booking.id, listingTitle, 'admin');

      // Notify about request review
      await notifyCancellationRequestReviewed(request.guestId, requestId, 'approved', adminNotes);
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail if notifications fail
    }
  } catch (error: any) {
    console.error('Error approving cancellation request:', error);
    throw new Error(error.message || 'Failed to approve cancellation request');
  }
};

/**
 * Reject a cancellation request
 * This will:
 * 1. Update the cancellation request status to 'rejected'
 * 2. Clear the cancellationRequestId from the booking
 * 3. Send notifications
 */
export const rejectCancellationRequest = async (
  requestId: string,
  adminId: string,
  adminNotes?: string
): Promise<void> => {
  try {
    // Get cancellation request
    const request = await getCancellationRequest(requestId);
    if (!request) {
      throw new Error('Cancellation request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cancellation request is already ${request.status}`);
    }

    // Update cancellation request
    await updateDoc(doc(db, 'cancellationRequests', requestId), {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminId,
      adminNotes: adminNotes || undefined,
    });

    // Clear cancellationRequestId from booking
    await updateBooking(request.bookingId, { 
      cancellationRequestId: null
    });

    // Send notifications
    try {
      await notifyCancellationRequestReviewed(request.guestId, requestId, 'rejected', adminNotes);
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail if notifications fail
    }
  } catch (error: any) {
    console.error('Error rejecting cancellation request:', error);
    throw new Error(error.message || 'Failed to reject cancellation request');
  }
};

