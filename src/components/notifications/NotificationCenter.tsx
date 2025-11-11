import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  Star,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Trash2,
  Settings,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import type { Notification } from '@/types/notification';
import { cn } from '@/lib/utils';

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
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    default:
      return 'bg-primary/10 text-primary';
  }
};

const getPriorityColor = (priority?: Notification['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-gray-400';
  }
};

const formatNotificationDate = (date: Date): string => {
  if (isToday(date)) {
    return 'Today';
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (isThisWeek(date)) {
    return format(date, 'EEEE'); // Day name
  } else if (isThisMonth(date)) {
    return format(date, 'MMMM d');
  } else {
    return format(date, 'MMM d, yyyy');
  }
};

export const NotificationCenter = ({ onClose, onNavigate }: NotificationCenterProps) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    browserNotificationsEnabled,
    soundEnabled,
    toggleBrowserNotifications,
    toggleSound,
    refreshNotifications
  } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | Notification['type']>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by read status
    if (filterRead === 'read') {
      filtered = filtered.filter(n => n.read);
    } else if (filterRead === 'unread') {
      filtered = filtered.filter(n => !n.read);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filterType, filterRead, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    
    filteredNotifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const groupKey = formatNotificationDate(date);
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    // Sort groups by date (most recent first)
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].createdAt);
      const dateB = new Date(b[1][0].createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedGroups;
  }, [filteredNotifications]);

  const unreadFiltered = useMemo(() => {
    return filteredNotifications.filter(n => !n.read);
  }, [filteredNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      onNavigate(notification.actionUrl);
      onClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRemoveNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await removeNotification(notificationId);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterRead('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || filterType !== 'all' || filterRead !== 'all';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refreshNotifications]);

  // Pull to refresh detection
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isPulling = scrollElement.scrollTop === 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 50) {
        handleRefresh();
        isPulling = false;
      }
    };

    scrollElement.addEventListener('touchstart', handleTouchStart);
    scrollElement.addEventListener('touchmove', handleTouchMove);

    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart);
      scrollElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isRefreshing, handleRefresh]);

  return (
    <Card 
      ref={cardRef}
      className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] max-h-[600px] z-50 shadow-xl border animate-in slide-in-from-top-2 fade-in-0 duration-200"
    >
      <CardHeader className="pb-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
              title="Refresh notifications"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8"
              title="Notification settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-8"
                title="Mark all as read"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-3 bg-muted/50 rounded-lg space-y-3 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <Label htmlFor="sound-toggle" className="text-sm font-medium cursor-pointer">
                  Notification Sound
                </Label>
              </div>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={toggleSound}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label htmlFor="browser-notifications-toggle" className="text-sm font-medium cursor-pointer">
                  Browser Notifications
                </Label>
              </div>
              <Switch
                id="browser-notifications-toggle"
                checked={browserNotificationsEnabled}
                onCheckedChange={toggleBrowserNotifications}
              />
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="h-9 text-xs flex-1">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="booking">Bookings</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRead} onValueChange={(value) => setFilterRead(value as any)}>
              <SelectTrigger className="h-9 text-xs flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="h-9 w-9"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {hasActiveFilters ? (
              <>
                <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">No notifications found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </>
            )}
          </div>
        ) : (
          <ScrollArea ref={scrollAreaRef} className="h-[500px]">
            <div className="divide-y">
              {groupedNotifications.map(([groupDate, groupNotifications]) => (
                <div key={groupDate}>
                  <div className="px-4 py-2 bg-muted/30 sticky top-0 z-10">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {groupDate}
                    </p>
                  </div>
                  {groupNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "px-4 py-3 hover:bg-accent transition-all cursor-pointer relative group",
                        !notification.read && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg flex-shrink-0 transition-transform group-hover:scale-110",
                          getNotificationColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <p className={cn(
                                "text-sm line-clamp-1",
                                notification.read ? "font-medium" : "font-semibold"
                              )}>
                                {notification.title}
                              </p>
                              {notification.priority === 'high' && !notification.read && (
                                <div className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0 mt-1.5 animate-pulse",
                                  getPriorityColor(notification.priority)
                                )} />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => handleRemoveNotification(e, notification.id)}
                              title="Delete notification"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer with stats */}
        {!loading && filteredNotifications.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              {unreadFiltered.length > 0 ? (
                <>
                  {unreadFiltered.length} unread {unreadFiltered.length === 1 ? 'notification' : 'notifications'}
                </>
              ) : (
                'All notifications read'
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
