'use client';

import { useState, useEffect } from 'react';
import type { ApiPatient } from '@/app/api/users/types';

interface UsePatientsOptions {
  limit?: number;
  id?: string;
  autoFetch?: boolean;
  includeStats?: boolean;
}

interface UsePatientsReturn {
  patients: ApiPatient[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePatients(options: UsePatientsOptions = {}): UsePatientsReturn {
  const { limit, id, autoFetch = true, includeStats = false } = options;
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (id) params.append('id', id);
      if (includeStats) params.append('includeStats', 'true');

      const response = await fetch(`/api/users/patients?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.status}`);
      }

      const result = await response.json();
      setPatients(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchPatients();
    }
  }, [limit, id, autoFetch, includeStats]);

  return {
    patients,
    loading,
    error,
    refetch: fetchPatients,
  };
}

