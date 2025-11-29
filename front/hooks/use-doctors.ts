'use client';

import { useState, useEffect } from 'react';
import type { ApiDoctor } from '@/app/api/users/types';

interface UseDoctorsOptions {
  limit?: number;
  id?: string;
  autoFetch?: boolean;
}

interface UseDoctorsReturn {
  doctors: ApiDoctor[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDoctors(options: UseDoctorsOptions = {}): UseDoctorsReturn {
  const { limit, id, autoFetch = true } = options;
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (id) params.append('id', id);

      const response = await fetch(`/api/users/doctors?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch doctors: ${response.status}`);
      }

      const result = await response.json();
      setDoctors(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchDoctors();
    }
  }, [limit, id, autoFetch]);

  return {
    doctors,
    loading,
    error,
    refetch: fetchDoctors,
  };
}

