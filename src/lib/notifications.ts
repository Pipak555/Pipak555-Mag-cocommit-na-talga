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
 * Get user notifications
 */
export const getUserNotifications = async (userId: string, limitCount: number = 50): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Subscribe to user notifications in real-time
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount: number = 50
) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    },
    (error) => {
      console.error('Error in notifications subscription:', error);
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
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    await Promise.all(
      snapshot.docs.map(doc => 
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
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
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
  listingTitle: string
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'booking',
      title: 'Booking Confirmed!',
      message: `Your booking for "${listingTitle}" has been confirmed.`,
      relatedId: bookingId,
      relatedType: 'booking',
      read: false,
      priority: 'high',
      actionUrl: `/guest/bookings`
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
  cancelledBy: 'guest' | 'host' | 'admin'
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'booking',
      title: 'Booking Cancelled',
      message: `Your booking for "${listingTitle}" has been cancelled ${cancelledBy === 'guest' ? 'by you' : cancelledBy === 'host' ? 'by the host' : 'by admin'}.`,
      relatedId: bookingId,
      relatedType: 'booking',
      read: false,
      priority: 'medium',
      actionUrl: `/guest/bookings`
    });
  } catch (error) {
    console.error('Error creating booking cancellation notification:', error);
  }
};

/**
 * Create notification for new message
 */
export const notifyNewMessage = async (
  userId: string,
  senderId: string,
  senderName: string,
  messageId: string
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${senderName}`,
      relatedId: messageId,
      relatedType: 'message',
      read: false,
      priority: 'high',
      actionUrl: `/guest/messages`
    });
  } catch (error) {
    console.error('Error creating new message notification:', error);
  }
};

/**
 * Create notification for payment
 */
export const notifyPayment = async (
  userId: string,
  transactionId: string,
  amount: number,
  type: 'completed' | 'refunded' | 'failed'
): Promise<void> => {
  try {
    const messages = {
      completed: `Payment of ₱${amount.toFixed(2)} has been processed.`,
      refunded: `Refund of ₱${amount.toFixed(2)} has been processed.`,
      failed: `Payment of ₱${amount.toFixed(2)} failed. Please try again.`
    };

    await createNotification({
      userId,
      type: 'payment',
      title: `Payment ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      message: messages[type],
      relatedId: transactionId,
      relatedType: 'transaction',
      read: false,
      priority: type === 'failed' ? 'high' : 'medium',
      actionUrl: `/guest/wallet`
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
  reviewId: string
): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'review',
      title: 'New Review',
      message: `You received a new review for "${listingTitle}"`,
      relatedId: reviewId,
      relatedType: 'review',
      read: false,
      priority: 'low',
      actionUrl: `/guest/listing/${listingId}`
    });
  } catch (error) {
    console.error('Error creating review notification:', error);
  }
};

