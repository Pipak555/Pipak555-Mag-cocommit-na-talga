import { useMemo } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  Star,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { Notification } from '@/types/notification';

interface NotificationCenterProps {
  onClose: () => void;
  onNavigate: (url: string) => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'booking':
      return <Calendar className="h-4 w-4" />;
    case 'message':
      return <MessageSquare className="h-4 w-4" />;
    case 'payment':
      return <DollarSign className="h-4 w-4" />;
    case 'review':
      return <Star className="h-4 w-4" />;
    case 'system':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'booking':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'message':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'payment':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    case 'review':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    case 'system':
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    default:
      return 'bg-primary/10 text-primary';
  }
};

export const NotificationCenter = ({ onClose, onNavigate }: NotificationCenterProps) => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  const readNotifications = useMemo(() => {
    return notifications.filter(n => n.read);
  }, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      onNavigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRemoveNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await removeNotification(notificationId);
  };

  return (
    <Card className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] max-h-[600px] z-50 shadow-xl border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Unread ({unreadNotifications.length})
                    </p>
                  </div>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="px-4 py-3 hover:bg-accent transition-colors cursor-pointer relative group"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold line-clamp-1">{notification.title}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleRemoveNotification(e, notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && (
                    <div className="px-4 py-2 bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Earlier ({readNotifications.length})
                      </p>
                    </div>
                  )}
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="px-4 py-3 hover:bg-accent transition-colors cursor-pointer relative group opacity-75"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleRemoveNotification(e, notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

