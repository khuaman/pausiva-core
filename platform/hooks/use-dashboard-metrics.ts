'use client';

import { useState, useEffect } from 'react';
import type { ApiPatient } from '@/app/api/users/types';
import type { ApiDoctor } from '@/app/api/users/types';

export interface DashboardMetrics {
  totalDoctors: number;
  totalPatients: number;
  activePatients: number;
  patientsWithRisk: number;
}

interface UseDashboardMetricsReturn {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDashboardMetrics(): UseDashboardMetricsReturn {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both doctors and patients
      const [doctorsRes, patientsRes] = await Promise.all([
        fetch('/api/users/doctors'),
        fetch('/api/users/patients'),
      ]);

      if (!doctorsRes.ok || !patientsRes.ok) {
        throw new Error('Failed to fetch metrics data');
      }

      const [doctorsData, patientsData] = await Promise.all([
        doctorsRes.json(),
        patientsRes.json(),
      ]);

      const doctors: ApiDoctor[] = doctorsData.data || [];
      const patients: ApiPatient[] = patientsData.data || [];

      // Calculate metrics
      const activePatients = patients.filter((p) => {
        const updatedAt = new Date(p.profile.updatedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return updatedAt >= thirtyDaysAgo;
      }).length;

      // Count patients with risk factors
      const patientsWithRisk = patients.filter((p) => {
        const profile = p.metadata.clinicalProfile as any;
        return profile?.risk_factors && profile.risk_factors.length > 0;
      }).length;

      setMetrics({
        totalDoctors: doctors.length,
        totalPatients: patients.length,
        activePatients,
        patientsWithRisk,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  };
}

