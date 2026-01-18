import React from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export function ErrorScreen({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error.',
  onRetry,
  onHome,
  errorDetails,
  showContactSupport = true
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
  errorDetails?: string;
  showContactSupport?: boolean;
}) {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4" role="alert" aria-live="assertive">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">{message}</p>

          {errorDetails && (
            <div className="text-left text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <p className="font-medium mb-1">Error Details:</p>
              <p className="break-all">{errorDetails}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {onRetry && (
              <Button onClick={onRetry} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            {onHome && (
              <Button onClick={onHome} variant="outline" className="w-full gap-2">
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            )}
          </div>

          {showContactSupport && (
            <div className="text-sm text-muted-foreground">
              <p>If the problem persists, please contact support.</p>
              <p className="mt-1">Support: support@somconnect.org</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}