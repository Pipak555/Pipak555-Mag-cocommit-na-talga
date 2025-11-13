import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Notification } from '@/types/notification';

/**
 * Create a notification in Firestore
 * 
 * Creates a new notification document for a user.
 * Notifications are used for booking updates, messages, payments, etc.
 * 
 * @param notification - Notification data (without id and createdAt)
 * @returns The ID of the created notification document
 * @throws Error if notification creation fails
 */
export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const notificationData = {
      ...notification,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get user notifications filtered by role
 */
export const getUserNotifications = async (
  userId: string, 
  role?: 'host' | 'guest' | 'admin',
  limitCount: number = 50
): Promise<Notification[]> => {
  try {
    let q;
    if (role) {
      // Filter by both userId and role for role-specific notifications
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('role', '==', role),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      // Fallback: get notifications without role filter (for backward compatibility)
      // Also include notifications without role field for migration
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
    
    // If role is specified, also filter client-side to include notifications without role (for migration)
    if (role) {
      return notifications.filter(n => !n.role || n.role === role);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Subscribe to user notifications in real-time, filtered by role
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  role?: 'host' | 'guest' | 'admin',
  limitCount: number = 50
) => {
  let q;
  if (role) {
    // Filter by both userId and role for role-specific notifications
    q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('role', '==', role),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
  } else {
    // Fallback: get notifications without role filter (for backward compatibility)
    q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      
      // If role is specified, also filter client-side to include notifications without role (for migration)
      if (role) {
        const filtered = notifications.filter(n => !n.role || n.role === role);
        callback(filtered);
      } else {
        callback(notifications);
      }
    },
    (error) => {
      console.error('Error in notifications subscription:', error);
      // Call callback with empty array on error to ensure loading state is cleared
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user (filtered by role)
 */
export const markAllNotificationsAsRead = async (
  userId: string,
  role?: 'host' | 'guest' | 'admin'
): Promise<void> => {
  try {
    let q;
    if (role) {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('role', '==', role),
        where('read', '==', false)
      );
    } else {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
    }
    
    const snapshot = await getDocs(q);
    
    // Also mark notifications without role field if role is specified (for migration)
    const docsToUpdate = role 
      ? snapshot.docs.filter(doc => {
          const data = doc.data();
          return !data.role || data.role === role;
        })
      : snapshot.docs;
    
    await Promise.all(
      docsToUpdate.map(doc => 
        updateDoc(doc.ref, { read: true })
      )
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true, // Soft delete by marking as read
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get unread notification count (filtered by role)
 */
export const getUnreadNotificationCount = async (
  userId: string,
  role?: 'host' | 'guest' | 'admin'
): Promise<number> => {
  try {
    let q;
    if (role) {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('role', '==', role),
        where('read', '==', false)
      );
    } else {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
    }
    
    const snapshot = await getDocs(q);
    
    // If role is specified, also count notifications without role field (for migration)
    if (role) {
      return snapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.role || data.role === role;
      }).length;
    }
    
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Create notification for booking confirmation
 */
export const notifyBookingConfirmed = async (
  userId: string,
  bookingId: string,
  listingTitle: string,
  role?: 'host' | 'guest' | 'admin'
): Promise<void> => {
  try {
    // Get user profile to determine role if not provided
    let userRole = role;
    if (!userRole) {
      const { getUserProfile } = await import('./firestore');
      const userProfile = await getUserProfile(userId);
      userRole = userProfile?.role || 'guest';
    }
    
    // Determine the correct bookings URL based on user role
    let actionUrl = '/guest/bookings';
    if (userRole === 'host') {
      actionUrl = '/host/bookings';
    }
    
    // Add bookingId query parameter to potentially highlight the specific booking
    actionUrl += `?bookingId=${bookingId}`;
    
    await createNotification({
      userId,
      role: userRole, // Include role for role-specific filtering
      type: 'booking',
      title: 'Booking Confirmed!',
      message: `Your booking for "${listingTitle}" has been confirmed.`,
      relatedId: bookingId,
      relatedType: 'booking',
      read: false,
      priority: 'high',
      actionUrl
    });
  } catch (error) {
    console.error('Error creating booking confirmation notification:', error);
  }
};

/**
 * Create notification for booking cancellation
 */
export const notifyBookingCancelled = async (
  userId: string,
  bookingId: string,
  listingTitle: string,
  cancelledBy: 'guest' | 'host' | 'admin',
  role?: 'host' | 'guest' | 'admin'
): Promise<void> => {
  try {
    // Get user profile to determine role if not provided
    let userRole = role;
    if (!userRole) {
      const { getUserProfile } = await import('./firestore');
      const userProfile = await getUserProfile(userId);
      userRole = userProfile?.role || 'guest';
    }
    
    await createNotification({
      userId,
      role: userRole, // Include role for role-specific filtering
      type: 'booking',
      title: 'Booking Cancelled',
      message: `Your booking for "${listingTitle}" has been cancelled ${cancelledBy === 'guest' ? 'by you' : cancelledBy === 'host' ? 'by the host' : 'by admin'}.`,
      relatedId: bookingId,
      relatedType: 'booking',
      read: false,
      priority: 'medium',
      actionUrl: userRole === 'host' ? '/host/bookings' : '/guest/bookings'
    });
  } catch (error) {
    console.error('Error creating booking cancellation notification:', error);
  }
};

/**
 * Create notification for new message (for receiver)
 */
export const notifyNewMessage = async (
  userId: string,
  senderId: string,
  senderName: string,
  messageId: string,
  role?: 'host' | 'guest' | 'admin'
): Promise<void> => {
  try {
    // Get user profile to determine role if not provided
    let userRole = role;
    if (!userRole) {
      const { getUserProfile } = await import('./firestore');
      const userProfile = await getUserProfile(userId);
      userRole = userProfile?.role || 'guest';
    }
    
    // Determine the correct messages URL based on user role with senderId query parameter
    let actionUrl = '/guest/messages';
    if (userRole === 'host') {
      actionUrl = '/host/messages';
    } else if (userRole === 'admin') {
      actionUrl = '/admin/messages';
    }
    
    // Add userId query parameter to open the specific conversation
    actionUrl += `?userId=${senderId}`;
    
    await createNotification({
      userId,
      role: userRole, // Include role for role-specific filtering
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${senderName}`,
      relatedId: messageId,
      relatedType: 'message',
      read: false,
      priority: 'high',
      actionUrl
    });
  } catch (error) {
    console.error('Error creating new message notification:', error);
  }
};

/**
 * Create notification for listing approval (for host)
 */
export const notifyListingApproved = async (
  hostId: string,
  listingId: string,
  listingTitle: string
): Promise<void> => {
  try {
    // Link to the host's listings management page with the specific listing ID
    // This allows hosts to view and manage their approved listing
    const actionUrl = `/host/listings?listingId=${listingId}`;
    
    await createNotification({
      userId: hostId,
      role: 'host', // This is always a host notification
      type: 'system',
      title: 'Listing Approved!',
      message: `Your listing "${listingTitle}" has been approved and is now live.`,
      relatedId: listingId,
      relatedType: 'listing',
      read: false,
      priority: 'high',
      actionUrl
    });
  } catch (error) {
    console.error('Error creating listing approval notification:', error);
  }
};

/**
 * Create notification for payment
 */
export const notifyPayment = async (
  userId: string,
  transactionId: string,
  amount: number,
  type: 'completed' | 'refunded' | 'failed',
  role?: 'host' | 'guest' | 'admin'
): Promise<void> => {
  try {
    // Get user profile to determine role if not provided
    let userRole = role;
    if (!userRole) {
      const { getUserProfile } = await import('./firestore');
      const userProfile = await getUserProfile(userId);
      userRole = userProfile?.role || 'guest';
    }
    
    const messages = {
      completed: `Payment of ₱${amount.toFixed(2)} has been processed.`,
      refunded: `Refund of ₱${amount.toFixed(2)} has been processed.`,
      failed: `Payment of ₱${amount.toFixed(2)} failed. Please try again.`
    };

    await createNotification({
      userId,
      role: userRole, // Include role for role-specific filtering
      type: 'payment',
      title: `Payment ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      message: messages[type],
      relatedId: transactionId,
      relatedType: 'transaction',
      read: false,
      priority: type === 'failed' ? 'high' : 'medium',
      actionUrl: userRole === 'host' ? '/host/wallet' : '/guest/wallet'
    });
  } catch (error) {
    console.error('Error creating payment notification:', error);
  }
};

/**
 * Create notification for new review
 */
export const notifyNewReview = async (
  userId: string,
  listingId: string,
  listingTitle: string,
  reviewId: string,
  role?: 'host' | 'guest' | 'admin'
): Promise<void> => {
  try {
    // Get user profile to determine role if not provided
    let userRole = role;
    if (!userRole) {
      const { getUserProfile } = await import('./firestore');
      const userProfile = await getUserProfile(userId);
      userRole = userProfile?.role || 'guest';
    }
    
    // Determine the correct action URL based on user role
    // Hosts should see their listings management page, guests should see the listing details
    let actionUrl = `/guest/listing/${listingId}`;
    if (userRole === 'host') {
      actionUrl = `/host/listings?listingId=${listingId}`;
    }
    
    await createNotification({
      userId,
      role: userRole, // Include role for role-specific filtering
      type: 'review',
      title: 'New Review',
      message: `You received a new review for "${listingTitle}"`,
      relatedId: reviewId,
      relatedType: 'review',
      read: false,
      priority: 'low',
      actionUrl
    });
  } catch (error) {
    console.error('Error creating review notification:', error);
  }
};

/**
 * Create notification for cancellation request created (for admin)
 */
export const notifyCancellationRequestCreated = async (
  bookingId: string,
  guestId: string,
  hostId: string
): Promise<void> => {
  try {
    // Get all admin users
    const { getDocs, collection, query, where, or } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    // Query users with admin role (check both role field and roles array)
    const usersQuery = query(
      collection(db, 'users'),
      or(
        where('role', '==', 'admin'),
        where('roles', 'array-contains', 'admin')
      )
    );
    const usersSnapshot = await getDocs(usersQuery);
    const admins = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get booking and listing details for notification
    const { getDoc, doc } = await import('firebase/firestore');
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    const booking = bookingDoc.exists() ? bookingDoc.data() : null;
    
    let listingTitle = 'a booking';
    if (booking?.listingId) {
      const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
      if (listingDoc.exists()) {
        listingTitle = listingDoc.data().title;
      }
    }

    // Notify all admins
    const notificationPromises = admins.map(admin =>
      createNotification({
        userId: admin.id,
        role: 'admin',
        type: 'system',
        title: 'New Cancellation Request',
        message: `A guest has requested to cancel their booking for "${listingTitle}"`,
        relatedId: bookingId,
        relatedType: 'booking',
        read: false,
        priority: 'high',
        actionUrl: '/admin/cancellation-requests'
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error creating cancellation request notification:', error);
  }
};

/**
 * Create notification for cancellation request reviewed (for guest)
 */
export const notifyCancellationRequestReviewed = async (
  guestId: string,
  requestId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<void> => {
  try {
    const { getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    // Get cancellation request details
    const requestDoc = await getDoc(doc(db, 'cancellationRequests', requestId));
    if (!requestDoc.exists()) return;
    
    const request = requestDoc.data();
    const bookingDoc = await getDoc(doc(db, 'bookings', request.bookingId));
    const booking = bookingDoc.exists() ? bookingDoc.data() : null;
    
    let listingTitle = 'your booking';
    if (booking?.listingId) {
      const listingDoc = await getDoc(doc(db, 'listing', booking.listingId));
      if (listingDoc.exists()) {
        listingTitle = listingDoc.data().title;
      }
    }

    const message = status === 'approved'
      ? `Your cancellation request for "${listingTitle}" has been approved. ${adminNotes ? `Note: ${adminNotes}` : 'A refund has been processed.'}`
      : `Your cancellation request for "${listingTitle}" has been rejected. ${adminNotes ? `Reason: ${adminNotes}` : ''}`;

    await createNotification({
      userId: guestId,
      role: 'guest',
      type: 'booking',
      title: status === 'approved' ? 'Cancellation Approved' : 'Cancellation Rejected',
      message,
      relatedId: request.bookingId,
      relatedType: 'booking',
      read: false,
      priority: status === 'approved' ? 'high' : 'medium',
      actionUrl: '/guest/bookings'
    });
  } catch (error) {
    console.error('Error creating cancellation request review notification:', error);
  }
};

