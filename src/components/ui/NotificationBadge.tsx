import React from 'react';
import { Bell } from 'lucide-react';
import { Badge } from './badge';
import { useNotificationContext } from '@/contexts/NotificationContext';

export function NotificationBadge() {
  const { unreadCount } = useNotificationContext();

  return (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center p-0"
          variant={unreadCount > 9 ? 'default' : 'destructive'}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </div>
  );
}