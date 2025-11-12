export interface Notification {
  id: string;
  userId: string;
  role?: 'host' | 'guest' | 'admin'; // Role-specific notifications for multi-role users
  type: 'booking' | 'message' | 'payment' | 'system' | 'review';
  title: string;
  message: string;
  relatedId?: string; // bookingId, messageId, transactionId, etc.
  relatedType?: 'booking' | 'message' | 'transaction' | 'listing' | 'review';
  read: boolean;
  createdAt: string;
  actionUrl?: string; // URL to navigate to when notification is clicked
  priority?: 'low' | 'medium' | 'high';
}

export interface NotificationPreferences {
  email: {
    bookingConfirmations: boolean;
    bookingCancellations: boolean;
    bookingReminders: boolean;
    newMessages: boolean;
    paymentUpdates: boolean;
    promotionalOffers: boolean;
  };
  inApp: {
    bookingUpdates: boolean;
    newMessages: boolean;
    paymentNotifications: boolean;
    systemAlerts: boolean;
  };
}

