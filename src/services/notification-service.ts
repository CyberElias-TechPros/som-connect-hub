import { Notification } from '@/lib/mock-data';

// Mock notification service with real-time capabilities
class NotificationService {
  private notifications: Notification[];
  private subscribers: ((notifications: Notification[]) => void)[];
  private realtimeEnabled: boolean;

  constructor() {
    this.notifications = [];
    this.subscribers = [];
    this.realtimeEnabled = false;
  }

  // Initialize with existing notifications
  initialize(notifications: Notification[]): void {
    this.notifications = notifications;
    this.notifySubscribers();
  }

  // Subscribe to notification updates
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Enable real-time updates
  enableRealtime(): void {
    this.realtimeEnabled = true;
    console.log('Real-time notifications enabled');
    
    // Simulate real-time updates every 30 seconds
    if (this.realtimeEnabled) {
      setInterval(() => {
        this.simulateRealtimeUpdate();
      }, 30000);
    }
  }

  // Disable real-time updates
  disableRealtime(): void {
    this.realtimeEnabled = false;
    console.log('Real-time notifications disabled');
  }

  // Simulate real-time notification updates
  private simulateRealtimeUpdate(): void {
    if (!this.realtimeEnabled) return;
    
    const notificationTypes: Notification['type'][] = ['content', 'qa', 'community', 'system'];
    const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    
    const newNotification: Notification = {
      id: Date.now().toString(),
      type: randomType,
      title: this.getRandomTitle(randomType),
      message: this.getRandomMessage(randomType),
      timestamp: new Date().toISOString(),
      isRead: false,
      actionUrl: this.getRandomActionUrl(randomType)
    };
    
    this.notifications = [newNotification, ...this.notifications];
    this.notifySubscribers();
  }

  private getRandomTitle(type: string): string {
    const titles: Record<string, string[]> = {
      content: ['New Content Available', 'Fresh Teaching Uploaded', 'Exclusive Content Released'],
      qa: ['Q&A Session Starting Soon', 'Live Q&A Reminder', 'New Q&A Session Scheduled'],
      community: ['New Community Activity', 'Someone Mentioned You', 'New Reply to Your Post'],
      system: ['System Update', 'Maintenance Notice', 'New Feature Available']
    };
    return titles[type][Math.floor(Math.random() * titles[type].length)];
  }

  private getRandomMessage(type: string): string {
    const messages: Record<string, string[]> = {
      content: [
        'A new teaching has been uploaded to the library.',
        'Check out the latest content from your favorite speaker.',
        'Exclusive premium content is now available.'
      ],
      qa: [
        'Live Q&A with Pastor Chris starts in 30 minutes.',
        'Don\'t miss the upcoming Q&A session on faith topics.',
        'A new Q&A session has been scheduled for this week.'
      ],
      community: [
        'Someone replied to your comment in the community.',
        'You have new activity in your favorite group.',
        'Check out the latest posts from your friends.'
      ],
      system: [
        'The app has been updated with new features.',
        'Scheduled maintenance will occur tonight.',
        'Your feedback has helped improve the app!'
      ]
    };
    return messages[type][Math.floor(Math.random() * messages[type].length)];
  }

  private getRandomActionUrl(type: string): string {
    const urls: Record<string, string[]> = {
      content: ['/library', '/content/new', '/premium'],
      qa: ['/qa', '/qa-sessions', '/live'],
      community: ['/community', '/community/post', '/groups'],
      system: ['/settings', '/help', '/whats-new']
    };
    return urls[type][Math.floor(Math.random() * urls[type].length)];
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return this.notifications;
  }

  // Mark notification as read
  markAsRead(id: string): void {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notifySubscribers();
  }

  // Mark notification as unread
  markAsUnread(id: string): void {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: false } : n
    );
    this.notifySubscribers();
  }

  // Delete notification
  deleteNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifySubscribers();
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.notifySubscribers();
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications = [];
    this.notifySubscribers();
  }

  // Notify all subscribers
  notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.notifications));
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  // Get notifications by type
  getNotificationsByType(type: string): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }
}

export const notificationService = new NotificationService();