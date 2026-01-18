import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export function useErrorHandling() {
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((err: unknown, context?: string) => {
    console.error(context ? `${context}:` : 'Error:', err);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }

    setError(new Error(errorMessage));
    
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });

    return errorMessage;
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const wrapAsync = useCallback(async <T,>(
    promise: Promise<T>,
    context?: string,
    loadingMessage?: string
  ): Promise<T | null> => {
    try {
      if (loadingMessage) {
        setIsLoading(true);
        toast({
          title: 'Processing',
          description: loadingMessage,
        });
      }

      const result = await promise;
      return result;
    } catch (err) {
      handleError(err, context);
      return null;
    } finally {
      if (loadingMessage) {
        setIsLoading(false);
      }
    }
  }, [handleError, toast]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    wrapAsync,
    setIsLoading,
  };
}

export type ErrorHandlingResult = ReturnType<typeof useErrorHandling>;