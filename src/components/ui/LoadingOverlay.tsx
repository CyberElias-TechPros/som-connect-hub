import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLoading } from '@/contexts/LoadingContext';

export function LoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" role="status" aria-live="polite">
      <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 text-center shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
          </div>
          <h3 className="text-lg font-semibold">Processing</h3>
          {loadingMessage && (
            <p className="text-muted-foreground text-sm">
              {loadingMessage}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70">
            Please wait...
          </p>
        </div>
      </div>
    </div>
  );
}