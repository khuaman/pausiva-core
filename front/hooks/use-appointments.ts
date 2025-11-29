'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ApiAppointmentSummary } from '@/app/api/appointments/types';
import type { AppointmentStatus } from '@/utils/types/appointments';

type UseAppointmentsOptions = {
  limit?: number;
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus[];
  from?: string;
  to?: string;
  autoFetch?: boolean;
};

type UseAppointmentsReturn = {
  appointments: ApiAppointmentSummary[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useAppointments(
  options: UseAppointmentsOptions = {}
): UseAppointmentsReturn {
  const {
    limit,
    patientId,
    doctorId,
    status,
    from,
    to,
    autoFetch = true,
  } = options;

  const [appointments, setAppointments] = useState<ApiAppointmentSummary[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (patientId) params.append('patientId', patientId);
      if (doctorId) params.append('doctorId', doctorId);
      if (status?.length) params.append('status', status.join(','));
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const query = params.toString();
      const response = await fetch(`/api/appointments${query ? `?${query}` : ''}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.status}`);
      }

      const result = await response.json();
      setAppointments(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [limit, patientId, doctorId, status, from, to]);

  useEffect(() => {
    if (autoFetch) {
      fetchAppointments();
    }
  }, [fetchAppointments, autoFetch]);

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
  };
}


