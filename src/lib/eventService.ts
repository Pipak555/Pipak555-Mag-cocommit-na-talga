/**
 * Event Service for Platform Events
 * 
 * Handles creation and distribution of platform events (coupons, announcements, etc.)
 */

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import type { PlatformEvent, Coupon, UserProfile } from '@/types';

/**
 * Create a platform event
 */
export const createPlatformEvent = async (
  eventData: Omit<PlatformEvent, 'id' | 'createdAt' | 'notificationSent'>
): Promise<string> => {
  try {
    const event: Omit<PlatformEvent, 'id'> = {
      ...eventData,
      createdAt: new Date().toISOString(),
      notificationSent: false,
      status: 'active'
    };

    const docRef = await addDoc(collection(db, 'events'), event);
    return docRef.id;
  } catch (error) {
    console.error('Error creating platform event:', error);
    throw error;
  }
};

/**
 * Send event notifications to target users
 */
export const sendEventNotifications = async (eventId: string): Promise<void> => {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent;

    if (event.notificationSent) {
      console.log('Event notifications already sent');
      return;
    }

    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserProfile & { id: string }));

    // Filter users based on target roles
    const targetUsers = users.filter(user => {
      // Check if user matches target roles
      const userRoles = user.roles && Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles
        : user.role
          ? [user.role]
          : [];

      const hasTargetRole = event.targetRoles.some(role => userRoles.includes(role));
      
      // If specific user IDs are provided, check if user is in the list
      if (event.targetUserIds && event.targetUserIds.length > 0) {
        return hasTargetRole && event.targetUserIds.includes(user.id);
      }

      return hasTargetRole;
    });

    // Send notifications to all target users
    const notificationPromises = targetUsers.map(async (user) => {
      try {
        // If event includes a coupon, add it to user's coupons
        if (event.type === 'coupon' && event.couponCode && event.couponDiscount) {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const existingCoupons = userData.coupons || [];
            
            // Check if user already has this coupon
            const hasCoupon = existingCoupons.some((c: Coupon) => c.code === event.couponCode);
            
            if (!hasCoupon) {
              const newCoupon: Coupon = {
                id: `${event.couponCode}-${user.id}`,
                code: event.couponCode,
                discount: event.couponDiscount,
                validUntil: event.couponValidUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days
                used: false,
                minSpend: event.couponMinSpend,
                eventId: eventId
              };

              await updateDoc(doc(db, 'users', user.id), {
                coupons: [...existingCoupons, newCoupon]
              });
            }
          }
        }

        // Create notification
        await createNotification({
          userId: user.id,
          type: 'system',
          title: event.title,
          message: event.description,
          relatedId: eventId,
          relatedType: 'event',
          read: false,
          priority: event.type === 'coupon' ? 'high' : 'medium',
          actionUrl: event.actionUrl || '/guest/wallet'
        });
      } catch (error) {
        console.error(`Error sending notification to user ${user.id}:`, error);
      }
    });

    await Promise.all(notificationPromises);

    // Mark event as notification sent
    await updateDoc(doc(db, 'events', eventId), {
      notificationSent: true,
      notificationSentAt: new Date().toISOString()
    });

    console.log(`✅ Event notifications sent to ${targetUsers.length} users`);
  } catch (error) {
    console.error('Error sending event notifications:', error);
    throw error;
  }
};

/**
 * Get all platform events
 */
export const getAllEvents = async (): Promise<PlatformEvent[]> => {
  try {
    const q = query(
      collection(db, 'events'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PlatformEvent));
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

/**
 * Get active events
 */
export const getActiveEvents = async (): Promise<PlatformEvent[]> => {
  try {
    const q = query(
      collection(db, 'events'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PlatformEvent));
  } catch (error) {
    console.error('Error fetching active events:', error);
    throw error;
  }
};

/**
 * Get events for a specific user (based on their roles)
 */
export const getUserEvents = async (userId: string, userRoles: string[]): Promise<PlatformEvent[]> => {
  try {
    const q = query(
      collection(db, 'events'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const allEvents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PlatformEvent));

    // Filter events that target this user's roles or specific user ID
    return allEvents.filter(event => {
      const hasTargetRole = event.targetRoles.some(role => userRoles.includes(role));
      const isTargetedUser = event.targetUserIds && event.targetUserIds.includes(userId);
      return hasTargetRole || isTargetedUser;
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    throw error;
  }
};

