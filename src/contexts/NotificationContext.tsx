import React, { createContext, useContext, useEffect, useState } from 'react';
import { notificationService } from '@/services/notification-service';
import { notifications as initialNotifications, Notification } from '@/lib/mock-data';

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  isRealtimeEnabled: boolean;
  toggleRealtime: () => void;
  refreshNotifications: () => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    // Initialize notification service
    notificationService.initialize(initialNotifications);
    
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setUnreadCount(updatedNotifications.filter(n => !n.isRead).length);
      setNotifications(updatedNotifications);
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

  const toggleRealtime = () => {
    setIsRealtimeEnabled(!isRealtimeEnabled);
  };

  const refreshNotifications = () => {
    // Pulls fresh notifications from the Cloudflare Worker when online.
    notificationService.refresh().then((items) => {
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.isRead).length);
    }).catch(() => notificationService.notifySubscribers());
  };

  const markAsRead = (id: string) => notificationService.markAsRead(id);
  const markAsUnread = (id: string) => notificationService.markAsUnread(id);
  const markAllAsRead = () => notificationService.markAllAsRead();
  const deleteNotification = (id: string) => notificationService.deleteNotification(id);
  const clearAll = () => notificationService.clearAll();

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, isRealtimeEnabled, toggleRealtime, refreshNotifications, markAsRead, markAsUnread, markAllAsRead, deleteNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}