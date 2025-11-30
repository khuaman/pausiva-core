"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AppointmentStatus } from '@/utils/types/appointments';

export default function MisCitas() {
  const { user } = useAuth();
  const { appointments, loading, error } = useAppointments({
    patientId: user?.id,
  });

  const statusLabels: Record<AppointmentStatus, string> = {
    scheduled: 'Programada',
    rescheduled: 'Reprogramada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No Asistió',
  };

  const getStatusLabel = (status: AppointmentStatus) => statusLabels[status] || status;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando citas...</p>
      </div>
    );
  }

  if (error || !appointments) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No se pudieron cargar tus citas</p>
      </div>
    );
  }

  const now = new Date();
  
  // Filter upcoming appointments: future date and scheduled/rescheduled
  const upcomingAppointments = appointments.filter(
    (apt) => {
      const appointmentDate = new Date(apt.scheduledAt);
      return appointmentDate >= now && 
             (apt.status === 'scheduled' || apt.status === 'rescheduled');
    }
  );
  
  // Filter past appointments: past date or completed status
  const pastAppointments = appointments.filter(
    (apt) => {
      const appointmentDate = new Date(apt.scheduledAt);
      return appointmentDate < now || apt.status === 'completed';
    }
  );
  
  // Sort upcoming by date (earliest first) and past by date (most recent first)
  const sortedUpcoming = [...upcomingAppointments].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const sortedPast = [...pastAppointments].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
  
  const nextAppointment = sortedUpcoming[0];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Mis Citas
            </h1>
            <p className="text-muted-foreground">
              Gestiona tus citas médicas
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Solicitar Cita
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-8 space-y-8">
        {/* Próxima Cita Destacada */}
        {nextAppointment && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Próxima Cita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="p-4 bg-primary text-primary-foreground rounded-lg text-center min-w-[80px]">
                  <p className="text-3xl font-bold">
                    {format(new Date(nextAppointment.scheduledAt), 'd', { locale: es })}
                  </p>
                  <p className="text-sm uppercase">
                    {format(new Date(nextAppointment.scheduledAt), 'MMM', { locale: es })}
                  </p>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {nextAppointment.type}
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(nextAppointment.scheduledAt), 'HH:mm', { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(nextAppointment.scheduledAt), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                    </div>
                    <p className="mt-2 text-foreground">
                      <span className="font-medium">Doctor:</span> {nextAppointment.doctor.fullName}
                    </p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button size="sm">Ver Detalles</Button>
                    <Button size="sm" variant="outline">Reprogramar</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Próximas Citas */}
        {sortedUpcoming.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Próximas Citas ({sortedUpcoming.length})
            </h2>
            <div className="grid gap-4">
              {sortedUpcoming.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent rounded-lg text-center min-w-[60px]">
                          <p className="text-xl font-bold text-foreground">
                            {format(new Date(apt.scheduledAt), 'd', { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {format(new Date(apt.scheduledAt), 'MMM', { locale: es })}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">{apt.type}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(apt.scheduledAt), 'HH:mm', { locale: es })}</p>
                          <p className="text-sm text-muted-foreground">{apt.doctor.fullName}</p>
                        </div>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">
                        {getStatusLabel(apt.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Historial de Citas */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Historial de Citas
          </h2>
          <div className="grid gap-4">
            {sortedPast.map((apt) => (
              <Card key={apt.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg text-center min-w-[60px]">
                        <p className="text-xl font-bold text-foreground">
                          {format(new Date(apt.scheduledAt), 'd', { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(new Date(apt.scheduledAt), 'MMM', { locale: es })}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">{apt.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.scheduledAt), "d 'de' MMMM, yyyy", { locale: es })} - {format(new Date(apt.scheduledAt), 'HH:mm', { locale: es })}
                        </p>
                        <p className="text-sm text-muted-foreground">{apt.doctor.fullName}</p>
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      {getStatusLabel(apt.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

