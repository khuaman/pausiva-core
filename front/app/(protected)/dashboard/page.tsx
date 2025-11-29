"use client";

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PatientListRow } from '@/components/dashboard/PatientListRow';
import { usePatients } from '@/hooks/use-patients';
import { useDoctors } from '@/hooks/use-doctors';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { Calendar, Users, Activity, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

const iconMap: Record<string, any> = {
  calendar: Calendar,
  users: Users,
  activity: Activity,
  clock: Clock,
};

export default function DashboardPage() {
  const router = useRouter();
  const { patients, loading: loadingPatients, error: patientsError } = usePatients({ limit: 10 });
  const { doctors, loading: loadingDoctors } = useDoctors();
  const { metrics, loading: loadingMetrics } = useDashboardMetrics();

  const handleViewDetail = (patientId: string) => {
    router.push(`/paciente/${patientId}`);
  };

  const isLoading = loadingPatients || loadingDoctors || loadingMetrics;

  // Calculate high-priority patients (symptom score >= 7 or multiple risk factors)
  const highPriorityCount = patients.filter((p) => {
    const profile = p.metadata.clinicalProfile as any;
    const symptomScore = profile?.symptom_score || 0;
    const riskFactors = profile?.risk_factors || [];
    return symptomScore >= 7 || riskFactors.length >= 2;
  }).length;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-1">
              Dashboard Principal
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 space-y-8">
        {/* Error State */}
        {patientsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar los datos: {patientsError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Métricas Generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Total de Pacientes"
              value={isLoading ? 0 : metrics?.totalPatients || 0}
              change={0}
              icon={Users}
            />
            <MetricCard
              label="Pacientes Activos"
              value={isLoading ? 0 : metrics?.activePatients || 0}
              change={0}
              icon={Activity}
            />
            <MetricCard
              label="Doctores Disponibles"
              value={isLoading ? 0 : doctors.length}
              change={0}
              icon={Calendar}
            />
            <MetricCard
              label="Prioridad Alta"
              value={isLoading ? 0 : highPriorityCount}
              change={0}
              icon={Clock}
            />
          </div>
        </section>

        {/* High Priority Patients Alert */}
        {highPriorityCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Hay {highPriorityCount} paciente{highPriorityCount > 1 ? 's' : ''} con prioridad alta que requiere{highPriorityCount > 1 ? 'n' : ''} atención.
            </AlertDescription>
          </Alert>
        )}

        {/* Patients List */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando pacientes...
                </div>
              ) : patients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes registrados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Paciente
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Etapa de Menopausia
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Nivel de Síntomas
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Prioridad
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((patient) => (
                        <PatientListRow
                          key={patient.id}
                          patient={patient}
                          onViewProfile={handleViewDetail}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

