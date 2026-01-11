import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Trash2, Check, CheckCheck } from 'lucide-react';
import { notifications } from '@/lib/mock-data';

export default function Notifications() {
  const [notifs, setNotifs] = useState(notifications);

  const markAsRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAsUnread = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const allNotifications = notifs;
  const unreadNotifications = notifs.filter(n => !n.isRead);

  const NotificationItem = ({ notification }: { notification: typeof notifications[0] }) => (
    <Card className={`mb-4 ${!notification.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">{notification.title}</CardTitle>
            <Badge variant={notification.type === 'content' ? 'default' : notification.type === 'qa' ? 'secondary' : 'outline'}>
              {notification.type}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {notification.isRead ? (
              <Button variant="ghost" size="sm" onClick={() => markAsUnread(notification.id)}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(notification.timestamp).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button onClick={markAllAsRead} disabled={unreadNotifications.length === 0}>
          Mark All as Read
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All ({allNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {allNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No notifications</p>
          ) : (
            allNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
        <TabsContent value="unread" className="mt-4">
          {unreadNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No unread notifications</p>
          ) : (
            unreadNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}