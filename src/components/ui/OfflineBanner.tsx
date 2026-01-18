import React from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from './button';

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <div className="bg-destructive/10 border border-destructive rounded-lg p-4 shadow-lg" role="alert" aria-live="assertive">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <WifiOff className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-destructive">Offline</h3>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-sm text-destructive/80">
              You're currently offline. Some features may not be available.
            </p>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}