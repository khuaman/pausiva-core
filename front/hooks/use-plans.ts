'use client';

import { useState, useEffect } from 'react';
import type { ApiPlan } from '@/app/api/plans/types';

type UsePlansOptions = {
  patientId?: string;
  appointmentId?: string;
  limit?: number;
  autoFetch?: boolean;
};

type UsePlansReturn = {
  plans: ApiPlan[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function usePlans(options: UsePlansOptions = {}): UsePlansReturn {
  const {
    patientId,
    appointmentId,
    limit = 5,
    autoFetch = true,
  } = options;

  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlans = async () => {
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

      const response = await fetch(`/api/plans?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plans: ${response.status}`);
      }

      const result = await response.json();
      setPlans(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchPlans();
    }
  }, [patientId, appointmentId, limit, autoFetch]);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
  };
}

