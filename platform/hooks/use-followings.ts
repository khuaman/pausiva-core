'use client';

import { useState, useEffect } from 'react';
import type { ApiFollowing } from '@/app/api/followings/types';

type UseFollowingsOptions = {
  patientId?: string;
  limit?: number;
  autoFetch?: boolean;
};

type UseFollowingsReturn = {
  followings: ApiFollowing[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useFollowings(options: UseFollowingsOptions = {}): UseFollowingsReturn {
  const { patientId, limit = 10, autoFetch = true } = options;
  const [followings, setFollowings] = useState<ApiFollowing[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchFollowings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (patientId) {
        params.append('patientId', patientId);
      }

      const response = await fetch(`/api/followings?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch followings: ${response.status}`);
      }

      const result = await response.json();
      setFollowings(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setFollowings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchFollowings();
    }
  }, [patientId, limit, autoFetch]);

  return {
    followings,
    loading,
    error,
    refetch: fetchFollowings,
  };
}

