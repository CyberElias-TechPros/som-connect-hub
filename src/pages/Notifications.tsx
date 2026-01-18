import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Trash2, Check, CheckCheck, Wifi, WifiOff, Settings } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { Switch } from '@/components/ui/switch';

export default function Notifications() {
  const {
    notifications: notifs,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    isRealtimeEnabled,
    toggleRealtime,
    getNotificationsByType
  } = useNotifications();

  const allNotifications = notifs;
  const unreadNotifications = notifs.filter(n => !n.isRead);
  const contentNotifications = getNotificationsByType('content');
  const qaNotifications = getNotificationsByType('qa');
  const communityNotifications = getNotificationsByType('community');
  const systemNotifications = getNotificationsByType('system');

  const NotificationItem = ({ notification }: { notification: typeof notifs[0] }) => (
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center gap-4">
          <Button onClick={markAllAsRead} disabled={unreadNotifications.length === 0}>
            Mark All as Read
          </Button>
          <div className="flex items-center gap-2">
            {isRealtimeEnabled ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-500" />
            )}
            <Switch
              id="realtime-toggle"
              checked={isRealtimeEnabled}
              onCheckedChange={toggleRealtime}
              className="data-[state=checked]:bg-green-500"
            />
            <span className="text-sm">Real-time Updates</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({allNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
          <TabsTrigger value="content">Content ({contentNotifications.length})</TabsTrigger>
          <TabsTrigger value="qa">Q&A ({qaNotifications.length})</TabsTrigger>
          <TabsTrigger value="system">System ({systemNotifications.length})</TabsTrigger>
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
        <TabsContent value="content" className="mt-4">
          {contentNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No content notifications</p>
          ) : (
            contentNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
        <TabsContent value="qa" className="mt-4">
          {qaNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No Q&A notifications</p>
          ) : (
            qaNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
        <TabsContent value="system" className="mt-4">
          {systemNotifications.length === 0 ? (
            <p className="text-center text-muted-foreground">No system notifications</p>
          ) : (
            systemNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}