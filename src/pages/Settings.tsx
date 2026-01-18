import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Sun, Globe, Download, Bell, BookOpen, Users, Megaphone } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { currentUser } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // Initialize notification settings from user preferences
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: currentUser.preferences?.notificationSettings?.pushNotifications || true,
    newContent: currentUser.preferences?.notificationSettings?.newContent || true,
    dailyReminders: currentUser.preferences?.notificationSettings?.dailyReminders || true,
    community: currentUser.preferences?.notificationSettings?.community || false,
  });
  
  const [autoDownload, setAutoDownload] = useState(
    currentUser.preferences?.autoDownload || false
  );
  
  const handleNotificationChange = (setting: keyof typeof notificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
    
    toast({
      title: 'Notification settings updated',
      description: `Turned ${value ? 'on' : 'off'} ${setting.replace(/([A-Z])/g, ' $1')}`,
    });
  };
  
  const handleAutoDownloadChange = (value: boolean) => {
    setAutoDownload(value);
    toast({
      title: 'Auto-download settings updated',
      description: value ? 'Content will be downloaded automatically on WiFi' : 'Auto-download disabled',
    });
  };
  
  const handleSavePreferences = () => {
    // In a real app, this would call an API to save preferences
    console.log('Saving preferences:', {
      theme,
      autoDownload,
      notificationSettings,
    });
    
    toast({
      title: 'Preferences saved',
      description: 'Your settings have been updated successfully',
    });
  };
  
  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" id="settings-heading">Settings</h1>
        <button
          onClick={handleSavePreferences}
          className="text-sm text-primary hover:underline"
          aria-label="Save all preferences"
          aria-describedby="settings-heading"
        >
          Save Preferences
        </button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <Label>Theme</Label>
            </div>
            <Select value={theme} onValueChange={(v: 'light' | 'dark' | 'system') => setTheme(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />Light
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />Dark
                  </span>
                </SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <Label>Language</Label>
            </div>
            <Select defaultValue="en">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Auto-download</Label>
                <p className="text-xs text-muted-foreground">Download new content on WiFi</p>
              </div>
            </div>
            <Switch
              checked={autoDownload}
              onCheckedChange={handleAutoDownloadChange}
              aria-label="Toggle auto-download"
              id="auto-download-switch"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 divide-y">
          <div className="p-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Manage what notifications you receive
            </p>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Enable all notifications</p>
              </div>
            </div>
            <Switch
              checked={notificationSettings.pushNotifications}
              onCheckedChange={(v) => handleNotificationChange('pushNotifications', v)}
              aria-label="Toggle push notifications"
              id="push-notifications-switch"
            />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>New Content</Label>
                <p className="text-xs text-muted-foreground">When new content is available</p>
              </div>
            </div>
            <Switch
              checked={notificationSettings.newContent}
              onCheckedChange={(v) => handleNotificationChange('newContent', v)}
              aria-label="Toggle new content notifications"
              id="new-content-switch"
            />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Daily Reminders</Label>
                <p className="text-xs text-muted-foreground">Confession & ROR reminders</p>
              </div>
            </div>
            <Switch
              checked={notificationSettings.dailyReminders}
              onCheckedChange={(v) => handleNotificationChange('dailyReminders', v)}
              aria-label="Toggle daily reminders notifications"
              id="daily-reminders-switch"
            />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Community</Label>
                <p className="text-xs text-muted-foreground">Replies and mentions</p>
              </div>
            </div>
            <Switch
              checked={notificationSettings.community}
              onCheckedChange={(v) => handleNotificationChange('community', v)}
              aria-label="Toggle community notifications"
              id="community-switch"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
