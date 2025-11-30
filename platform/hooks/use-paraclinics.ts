'use client';

import { useState, useEffect } from 'react';
import type { ApiParaclinic } from '@/app/api/paraclinics/types';

type UseParaclinicsOptions = {
  patientId?: string;
  appointmentId?: string;
  limit?: number;
  autoFetch?: boolean;
};

type UseParaclinicsReturn = {
  paraclinics: ApiParaclinic[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useParaclinics(options: UseParaclinicsOptions = {}): UseParaclinicsReturn {
  const {
    patientId,
    appointmentId,
    limit = 10,
    autoFetch = true,
  } = options;

  const [paraclinics, setParaclinics] = useState<ApiParaclinic[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchParaclinics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (patientId) {
        params.append('patientId', patientId);
      }
      if (appointmentId) {
        params.append('appointmentId', appointmentId);
      }

      const response = await fetch(`/api/paraclinics?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch paraclinics: ${response.status}`);
      }

      const result = await response.json();
      setParaclinics(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setParaclinics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchParaclinics();
    }
  }, [patientId, appointmentId, limit, autoFetch]);

  return {
    paraclinics,
    loading,
    error,
    refetch: fetchParaclinics,
  };
}

