import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Play, Pause } from 'lucide-react';
import { conferences, podcasts, originals } from '@/lib/mock-data';

export default function Offline() {
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const allContent = [...conferences, ...podcasts, ...originals];
  const downloadedContent = allContent.filter(c => c.isDownloaded);
  const downloadingContent = allContent.filter(c => c.progress && c.progress > 0 && c.progress < 100);

  const storageUsed = downloadedContent.reduce((total, item) => {
    // Mock storage calculation - in real app, this would be actual file sizes
    return total + parseInt(item.duration.replace(':', '')) * 10; // Mock MB
  }, 0);
  const storageLimit = 5000; // 5GB in MB

  const deleteDownload = (id: string) => {
    // In real app, this would update the backend
    console.log('Delete download:', id);
  };

  const startDownload = (id: string) => {
    // In real app, this would initiate download
    console.log('Start download:', id);
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Offline Manager</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Offline Availability
            <Switch checked={offlineEnabled} onCheckedChange={setOfflineEnabled} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enable offline mode to download content for offline viewing. Premium subscribers can download unlimited content.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage Used</span>
              <span>{storageUsed} MB / {storageLimit} MB</span>
            </div>
            <Progress value={(storageUsed / storageLimit) * 100} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Downloaded Content ({downloadedContent.length})</h2>
        {downloadedContent.length === 0 ? (
          <p className="text-center text-muted-foreground">No downloaded content</p>
        ) : (
          downloadedContent.map(content => (
            <Card key={content.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img src={content.thumbnail} alt={content.title} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-medium">{content.title}</h3>
                    <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
                    <p className="text-xs text-muted-foreground">{content.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Downloaded</Badge>
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteDownload(content.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Downloading ({downloadingContent.length})</h2>
        {downloadingContent.length === 0 ? (
          <p className="text-center text-muted-foreground">No active downloads</p>
        ) : (
          downloadingContent.map(content => (
            <Card key={content.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img src={content.thumbnail} alt={content.title} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-medium">{content.title}</h3>
                    <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={content.progress} className="flex-1" />
                      <span className="text-xs">{content.progress}%</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Pause className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available for Download</h2>
        {allContent.filter(c => !c.isDownloaded && (!c.progress || c.progress === 0)).slice(0, 5).map(content => (
          <Card key={content.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <img src={content.thumbnail} alt={content.title} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-medium">{content.title}</h3>
                  <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
                  <p className="text-xs text-muted-foreground">{content.duration}</p>
                </div>
                <Button onClick={() => startDownload(content.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}