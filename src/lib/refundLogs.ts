/**
 * Refund Logs Service
 * 
 * Stores comprehensive refund logs for audit tracking
 */

import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface RefundLog {
  id?: string;
  bookingId: string;
  guestId: string;
  hostId: string;
  listingId: string;
  originalAmount: number; // Original booking amount in PHP
  refundAmount: number; // Amount refunded in PHP
  refundPercentage: number; // Percentage refunded (0, 0.5, or 1.0)
  refundStatus: 'not_eligible' | 'eligible' | 'processing' | 'refunded' | 'failed';
  cancelledBy: 'guest' | 'host' | 'admin';
  cancellationReason?: string;
  refundReason: string; // Policy-based reason (e.g., "Flexible cancellation (48+ hours)")
  hoursUntilCheckIn: number;
  refundTransactionId?: string; // Transaction ID of the refund
  hostDeductionTransactionId?: string; // Transaction ID for host deduction
  errorMessage?: string; // Error message if refund failed
  paymentGateway?: 'wallet' | 'paypal' | 'gcash'; // Original payment method
  processedAt: string; // When refund was processed
  processedBy?: string; // User ID who processed the refund (for admin-initiated refunds)
  metadata?: {
    [key: string]: any; // Additional metadata for tracking
  };
}

/**
 * Create a refund log entry
 */
export const createRefundLog = async (logData: Omit<RefundLog, 'id' | 'processedAt'>): Promise<string> => {
  try {
    // Firestore doesn't allow undefined values - filter them out
    const logEntry: any = {
      ...logData,
      processedAt: new Date().toISOString()
    };
    
    // Remove undefined values (Firestore doesn't support them)
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined) {
        delete logEntry[key];
      }
    });

    const logRef = await addDoc(collection(db, 'refundLogs'), logEntry);
    return logRef.id;
  } catch (error: any) {
    console.error('Error creating refund log:', error);
    // Don't throw - refund logging failure shouldn't block refund processing
    return '';
  }
};

/**
 * Get refund logs for a booking
 * Requires userId to filter by guestId or hostId for Firestore security rules
 */
export const getRefundLogsForBooking = async (bookingId: string, userId: string): Promise<RefundLog[]> => {
  try {
    // Query by bookingId AND (guestId OR hostId) to satisfy Firestore security rules
    // We need to query separately for guest and host, then combine results
    const guestQuery = query(
      collection(db, 'refundLogs'),
      where('bookingId', '==', bookingId),
      where('guestId', '==', userId),
      orderBy('processedAt', 'desc')
    );
    
    const hostQuery = query(
      collection(db, 'refundLogs'),
      where('bookingId', '==', bookingId),
      where('hostId', '==', userId),
      orderBy('processedAt', 'desc')
    );

    let guestSnapshot, hostSnapshot;
    try {
      [guestSnapshot, hostSnapshot] = await Promise.all([
        getDocs(guestQuery),
        getDocs(hostQuery)
      ]);
    } catch (queryError: any) {
      // If index is missing, try without orderBy
      if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
        console.warn('⚠️ Index missing for refundLogs query, trying without orderBy');
        try {
          const guestQueryNoOrder = query(
            collection(db, 'refundLogs'),
            where('bookingId', '==', bookingId),
            where('guestId', '==', userId)
          );
          const hostQueryNoOrder = query(
            collection(db, 'refundLogs'),
            where('bookingId', '==', bookingId),
            where('hostId', '==', userId)
          );
          [guestSnapshot, hostSnapshot] = await Promise.all([
            getDocs(guestQueryNoOrder),
            getDocs(hostQueryNoOrder)
          ]);
          // Sort manually
          const guestDocs = guestSnapshot.docs.sort((a, b) => {
            const aTime = new Date(a.data().processedAt || 0).getTime();
            const bTime = new Date(b.data().processedAt || 0).getTime();
            return bTime - aTime;
          });
          const hostDocs = hostSnapshot.docs.sort((a, b) => {
            const aTime = new Date(a.data().processedAt || 0).getTime();
            const bTime = new Date(b.data().processedAt || 0).getTime();
            return bTime - aTime;
          });
          guestSnapshot = { docs: guestDocs } as any;
          hostSnapshot = { docs: hostDocs } as any;
        } catch (permissionError: any) {
          // If permission error occurs, return empty array (rules might not be deployed yet)
          if (permissionError.code === 'permission-denied') {
            console.warn('⚠️ Permission denied for refundLogs query (rules may not be deployed). Returning empty array.');
            return [];
          }
          throw permissionError;
        }
      } else if (queryError.code === 'permission-denied') {
        // If permission error occurs, return empty array (rules might not be deployed yet)
        console.warn('⚠️ Permission denied for refundLogs query (rules may not be deployed). Returning empty array.');
        return [];
      } else {
        throw queryError;
      }
    }

    // Combine results and remove duplicates
    const allDocs = [...guestSnapshot.docs, ...hostSnapshot.docs];
    const uniqueDocs = Array.from(
      new Map(allDocs.map(doc => [doc.id, doc])).values()
    );

    return uniqueDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RefundLog));
  } catch (error: any) {
    console.error('Error getting refund logs:', error);
    // Return empty array instead of throwing - allows refund to proceed
    return [];
  }
};

/**
 * Get refund logs for a user (guest or host)
 */
export const getRefundLogsForUser = async (
  userId: string,
  role: 'guest' | 'host' = 'guest',
  limitCount: number = 50
): Promise<RefundLog[]> => {
  try {
    const field = role === 'guest' ? 'guestId' : 'hostId';
    const q = query(
      collection(db, 'refundLogs'),
      where(field, '==', userId),
      orderBy('processedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RefundLog));
  } catch (error: any) {
    console.error('Error getting refund logs for user:', error);
    return [];
  }
};

/**
 * Check if a booking has already been refunded
 * Requires userId to filter by guestId or hostId for Firestore security rules
 */
export const hasBookingBeenRefunded = async (bookingId: string, userId: string): Promise<boolean> => {
  try {
    const logs = await getRefundLogsForBooking(bookingId, userId);
    return logs.some(log => log.refundStatus === 'refunded');
  } catch (error) {
    console.error('Error checking refund status:', error);
    return false;
  }
};

