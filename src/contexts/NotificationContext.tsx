import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification
} from '@/lib/notifications';
import { 
  requestNotificationPermission, 
  sendBrowserNotification, 
  playNotificationSound 
} from '@/lib/browserNotifications';
import type { Notification } from '@/types/notification';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  browserNotificationsEnabled: boolean;
  soundEnabled: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  removeMultipleNotifications: (notificationIds: string[]) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  toggleBrowserNotifications: () => Promise<void>;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, userRole } = useAuth(); // Get userRole for role-specific notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const previousNotificationsRef = useRef<Notification[]>([]);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await getUnreadNotificationCount(user.uid, userRole || undefined);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, [user, userRole]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (user) {
      requestNotificationPermission().then(granted => {
        setBrowserNotificationsEnabled(granted);
      });
    }
  }, [user]);

  // Subscribe to notifications - filtered by current role
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    let hasReceivedData = false;
    
    const unsubscribe = subscribeToNotifications(
      user.uid, 
      (updatedNotifications) => {
        hasReceivedData = true;
        const previousNotifications = previousNotificationsRef.current;
        
        // Detect new notifications
        if (previousNotifications.length > 0) {
          const newNotifications = updatedNotifications.filter(
            newNotif => !previousNotifications.some(prevNotif => prevNotif.id === newNotif.id)
          );

          // Only show notifications for unread items
          const unreadNewNotifications = newNotifications.filter(n => !n.read);

          unreadNewNotifications.forEach(notification => {
            // Play sound if enabled
            if (soundEnabled) {
              const soundType = notification.type === 'message' ? 'message' : 
                              notification.priority === 'high' ? 'alert' : 'default';
              playNotificationSound(soundType);
            }

            // Send browser notification if enabled and page is not focused
            if (browserNotificationsEnabled && document.hidden) {
              sendBrowserNotification(notification.title, {
                body: notification.message,
                tag: notification.id,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                onClick: () => {
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                },
              });
            }
          });
        }

        previousNotificationsRef.current = updatedNotifications;
        setNotifications(updatedNotifications);
        const unread = updatedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        setLoading(false);
      },
      userRole || undefined // Pass current role to filter notifications
    );

    // Fallback timeout to ensure loading state is cleared even if subscription never fires
    const timeoutId = setTimeout(() => {
      if (!hasReceivedData) {
        console.warn('Notification subscription timeout - clearing loading state');
        setLoading(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user, userRole, browserNotificationsEnabled, soundEnabled]);

  // Refresh notifications manually
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    await refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  // Mark all notifications as read (filtered by current role)
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    try {
      await markAllNotificationsAsRead(user.uid, userRole || undefined);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  }, [user, userRole]);

  // Remove notification
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (error) {
      console.error('Error removing notification:', error);
      toast.error('Failed to remove notification');
    }
  }, []);

  // Remove multiple notifications
  const removeMultipleNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      await Promise.all(notificationIds.map(id => deleteNotification(id)));
      setNotifications(prev => {
        const removed = prev.filter(n => notificationIds.includes(n.id));
        const unreadRemoved = removed.filter(n => !n.read).length;
        if (unreadRemoved > 0) {
          setUnreadCount(count => Math.max(0, count - unreadRemoved));
        }
        return prev.filter(n => !notificationIds.includes(n.id));
      });
      toast.success(`${notificationIds.length} notification${notificationIds.length > 1 ? 's' : ''} removed`);
    } catch (error) {
      console.error('Error removing notifications:', error);
      toast.error('Failed to remove notifications');
    }
  }, []);

  // Toggle browser notifications
  const toggleBrowserNotifications = useCallback(async () => {
    if (browserNotificationsEnabled) {
      setBrowserNotificationsEnabled(false);
      toast.info('Browser notifications disabled');
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setBrowserNotificationsEnabled(true);
        toast.success('Browser notifications enabled');
      } else {
        toast.error('Please enable notifications in your browser settings');
      }
    }
  }, [browserNotificationsEnabled]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      if (newValue) {
        playNotificationSound('default');
        toast.success('Notification sound enabled');
      } else {
        toast.info('Notification sound disabled');
      }
      return newValue;
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        browserNotificationsEnabled,
        soundEnabled,
        markAsRead,
        markAllAsRead,
        removeNotification,
        removeMultipleNotifications,
        refreshNotifications,
        toggleBrowserNotifications,
        toggleSound
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

