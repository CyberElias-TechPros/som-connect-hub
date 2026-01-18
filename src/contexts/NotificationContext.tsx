import React, { createContext, useContext, useEffect, useState } from 'react';
import { notificationService } from '@/services/notification-service';
import { notifications as initialNotifications, Notification } from '@/lib/mock-data';

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  isRealtimeEnabled: boolean;
  toggleRealtime: () => void;
  refreshNotifications: () => void;
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
    // In a real app, this would fetch fresh notifications from the server
    console.log('Refreshing notifications...');
    notificationService.notifySubscribers();
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, isRealtimeEnabled, toggleRealtime, refreshNotifications }}>
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