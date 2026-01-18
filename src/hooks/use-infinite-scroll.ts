import { useState, useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll<T>(
  initialData: T[],
  loadMore: (page: number) => Promise<T[]>, 
  itemsPerPage: number = 12
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMoreData = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newData = await loadMore(page + 1);
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError('Failed to load more data');
      console.error('Error loading more data:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, loadMore]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreData();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.current.observe(loadMoreRef.current);
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadMoreData, hasMore, loading]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newData = await loadMore(1);
      setData(newData);
      setPage(1);
      setHasMore(newData.length >= itemsPerPage);
    } catch (err) {
      setError('Failed to refresh data');
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadMore, itemsPerPage]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMoreRef,
    refreshData,
    loadMore: loadMoreData
  };
}