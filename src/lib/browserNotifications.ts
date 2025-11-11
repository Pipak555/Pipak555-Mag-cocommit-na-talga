/**
 * Browser/Desktop Notification Service
 * Handles browser notification API for desktop notifications
 */

let permissionGranted = false;

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    permissionGranted = permission === 'granted';
    return permissionGranted;
  }

  return false;
};

/**
 * Check if notifications are supported and permitted
 */
export const canSendNotifications = (): boolean => {
  return 'Notification' in window && Notification.permission === 'granted';
};

/**
 * Send a browser notification
 */
export const sendBrowserNotification = (
  title: string,
  options?: NotificationOptions
): Notification | null => {
  if (!canSendNotifications()) {
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag || 'notification',
      requireInteraction: false,
      silent: false,
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options?.onClick) {
        options.onClick();
      }
    };

    return notification;
  } catch (error) {
    console.error('Error sending browser notification:', error);
    return null;
  }
};

/**
 * Play notification sound
 */
export const playNotificationSound = (type: 'default' | 'message' | 'alert' = 'default'): void => {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Simple beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different types
    const frequencies: Record<string, number> = {
      default: 800,
      message: 600,
      alert: 1000,
    };
    
    oscillator.frequency.value = frequencies[type] || frequencies.default;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

