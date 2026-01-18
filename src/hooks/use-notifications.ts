import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notification-service';
import { notifications as initialNotifications } from '@/lib/mock-data';

export function useNotifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);

  useEffect(() => {
    // Initialize notification service
    notificationService.initialize(initialNotifications);
    
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.isRead).length);
    });
    
    // Set initial unread count
    setUnreadCount(notificationService.getUnreadCount());
    
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isRealtimeEnabled) {
      notificationService.enableRealtime();
    } else {
      notificationService.disableRealtime();
    }
  }, [isRealtimeEnabled]);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAsUnread = (id: string) => {
    notificationService.markAsUnread(id);
  };

  const deleteNotification = (id: string) => {
    notificationService.deleteNotification(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const clearAll = () => {
    notificationService.clearAll();
  };

  const toggleRealtime = () => {
    setIsRealtimeEnabled(!isRealtimeEnabled);
  };

  const getNotificationsByType = (type: string) => {
    return notificationService.getNotificationsByType(type);
  };

  return {
    notifications,
    unreadCount,
    isRealtimeEnabled,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    clearAll,
    toggleRealtime,
    getNotificationsByType
  };
}