import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const navigate = useNavigate();
  const previousUnreadCount = useRef(unreadCount);

  // Detect new notifications
  useEffect(() => {
    if (unreadCount > previousUnreadCount.current && !isOpen) {
      setHasNewNotification(true);
      // Reset after animation
      const timer = setTimeout(() => setHasNewNotification(false), 2000);
      return () => clearTimeout(timer);
    }
    previousUnreadCount.current = unreadCount;
  }, [unreadCount, isOpen]);

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "relative transition-all",
          hasUnread && "hover:bg-primary/10",
          hasNewNotification && "animate-pulse"
        )}
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNewNotification(false);
        }}
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className={cn(
          "h-5 w-5 transition-transform",
          isOpen && "scale-110"
        )} />
        {hasUnread && (
          <Badge 
            className={cn(
              "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive hover:bg-destructive transition-all",
              hasNewNotification && "animate-bounce scale-110"
            )}
            variant="destructive"
          >
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
      {isOpen && (
        <NotificationCenter 
          onClose={() => setIsOpen(false)}
          onNavigate={(url) => {
            setIsOpen(false);
            navigate(url);
          }}
        />
      )}
    </div>
  );
};

