"use client";

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { PatientRow } from '@/components/dashboard/PatientRow';
import { mockMetrics, mockAlerts, getTodaysPatients } from '@/data/mockData';
import { Calendar, Users, Activity, Clock, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const iconMap: Record<string, any> = {
  calendar: Calendar,
  users: Users,
  activity: Activity,
  clock: Clock,
};

export default function DashboardPage() {
  const router = useRouter();
  const todaysPatients = getTodaysPatients();

  const handleViewDetail = (patientId: string) => {
    router.push(`/paciente/${patientId}`);
  };

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
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-muted-foreground" />
              {mockAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {mockAlerts.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 space-y-8">
        {/* Metrics */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Métricas Generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockMetrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                change={metric.change}
                icon={iconMap[metric.icon]}
              />
            ))}
          </div>
        </section>

        {/* Alerts */}
        {mockAlerts.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Alertas Urgentes
            </h2>
            <div className="space-y-4">
              {mockAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onViewDetail={handleViewDetail}
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's Patients */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Pacientes del Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Paciente
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Hora
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Doctor
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysPatients.map((patient) => (
                      <PatientRow
                        key={patient.id}
                        patient={patient}
                        onViewProfile={handleViewDetail}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

