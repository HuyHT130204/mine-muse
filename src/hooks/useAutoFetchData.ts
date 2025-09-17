'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnChainData } from '@/lib/types';

interface UseAutoFetchDataOptions {
  interval?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoFetchData(options: UseAutoFetchDataOptions = {}) {
  const { interval = 30000, enabled = true } = options; // Default 30 seconds
  const [data, setData] = useState<OnChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/onchain-data');
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
        setLastUpdated(new Date());
        console.log('✅ Auto-fetched on-chain data:', result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Auto-fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Auto-fetch interval
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(fetchData, interval);
    return () => clearInterval(intervalId);
  }, [fetchData, interval, enabled]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchData,
  };
}
