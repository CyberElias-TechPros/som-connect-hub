import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Play, Pause, Settings, AlertTriangle } from 'lucide-react';
import { useOffline } from '@/hooks/use-offline';
import { conferences, podcasts, originals, playlists, publications } from '@/lib/mock-data';

export default function Offline() {
  const {
    cachedItems,
    storageUsed,
    storageLimit,
    autoDownloadEnabled,
    toggleAutoDownload,
    removeCachedItem,
    cacheItem,
    clearAllCache,
    getStorageUsagePercentage,
    getAvailableStorage,
    getCachedContent,
    getCachedPlaylists,
    getCachedPublications,
    simulateDownloadProgress,
  } = useOffline();

  const [downloadingItems, setDownloadingItems] = useState<{id: string, progress: number}[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());
  const allContent = [...conferences, ...podcasts, ...originals];
  const availableContent = allContent.filter(c => !cachedItems.some(item => item.id === c.id));

  const deleteDownload = (id: string) => {
    removeCachedItem(id);
  };

  const startDownload = (id: string) => {
    const content = allContent.find(c => c.id === id);
    if (content) {
      setActiveDownloads(prev => new Set(prev).add(id));
      
      simulateDownloadProgress(id, (progress) => {
        setDownloadingItems(prev => {
          const existingIndex = prev.findIndex(item => item.id === id);
          if (existingIndex !== -1) {
            return prev.map(item =>
              item.id === id ? { ...item, progress } : item
            );
          } else {
            return [...prev, { id, progress }];
          }
        });
        
        if (progress === 100) {
          // Cache the item when download completes
          cacheItem(content).then(() => {
            setActiveDownloads(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            setDownloadingItems(prev => prev.filter(item => item.id !== id));
          });
        }
      });
    }
  };

  function setOfflineEnabled(checked: boolean): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl font-bold">Offline Manager</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Offline Availability
            <Switch checked={setOfflineEnabled} onCheckedChange={setOfflineEnabled} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enable offline mode to download content for offline viewing. Premium subscribers can download unlimited content.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span>{storageUsed} MB / {storageLimit} MB</span>
              </div>
              <Progress value={getStorageUsagePercentage()} className="w-full" />
            </div>
            <div className="flex justify-between text-sm">
              <span>Available Storage</span>
              <span>{getAvailableStorage()} MB available</span>
            </div>
            {getStorageUsagePercentage() > 90 && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Storage almost full! Consider clearing some downloads.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Downloaded Content ({getCachedContent().length})</h2>
          {getCachedContent().length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllCache} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
        {getCachedContent().length === 0 ? (
          <p className="text-center text-muted-foreground">No downloaded content</p>
        ) : (
          getCachedContent().map(content => (
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
        <h2 className="text-xl font-semibold">Downloading ({downloadingItems.length})</h2>
        {downloadingItems.length === 0 ? (
          <p className="text-center text-muted-foreground">No active downloads</p>
        ) : (
          downloadingItems.map(download => {
            const content = allContent.find(c => c.id === download.id);
            if (!content) return null;
            
            return (
              <Card key={download.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <img src={content.thumbnail} alt={content.title} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <h3 className="font-medium">{content.title}</h3>
                      <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={download.progress} className="flex-1" />
                        <span className="text-xs">{download.progress}%</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={true}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available for Download</h2>
        {availableContent.slice(0, 5).map(content => (
          <Card key={content.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <img src={content.thumbnail} alt={content.title} className="w-16 h-16 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-medium">{content.title}</h3>
                  <p className="text-sm text-muted-foreground">{content.speaker.name}</p>
                  <p className="text-xs text-muted-foreground">{content.duration}</p>
                </div>
                <Button
                  onClick={() => startDownload(content.id)}
                  disabled={activeDownloads.has(content.id) || getAvailableStorage() < 10}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {activeDownloads.has(content.id) ? 'Queued' : 'Download'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {availableContent.length === 0 && (
          <p className="text-center text-muted-foreground">All available content has been downloaded</p>
        )}
      </div>
    </div>
  );
}