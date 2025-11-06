import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { Badge } from '@/components/ui/badge';

export const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive hover:bg-destructive"
            variant="destructive"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
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

