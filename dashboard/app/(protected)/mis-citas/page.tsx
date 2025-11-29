"use client";

import { getPatientById } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MisCitas() {
  // En producción, esto vendría del ID del usuario autenticado
  const patient = getPatientById('P001');

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No se pudieron cargar tus citas</p>
      </div>
    );
  }

  const upcomingAppointments = patient.appointments.filter(
    (apt) => apt.status === 'pendiente'
  );
  const pastAppointments = patient.appointments.filter(
    (apt) => apt.status === 'completada'
  );

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
        {patient.nextAppointment && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Próxima Cita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="p-4 bg-primary text-primary-foreground rounded-lg text-center min-w-[80px]">
                  <p className="text-3xl font-bold">
                    {format(new Date(patient.nextAppointment.date), 'd', { locale: es })}
                  </p>
                  <p className="text-sm uppercase">
                    {format(new Date(patient.nextAppointment.date), 'MMM', { locale: es })}
                  </p>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {patient.nextAppointment.type}
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{patient.nextAppointment.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(patient.nextAppointment.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                    </div>
                    <p className="mt-2 text-foreground">
                      <span className="font-medium">Doctor:</span> {patient.nextAppointment.doctor}
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
        {upcomingAppointments.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Próximas Citas ({upcomingAppointments.length})
            </h2>
            <div className="grid gap-4">
              {upcomingAppointments.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent rounded-lg text-center min-w-[60px]">
                          <p className="text-xl font-bold text-foreground">
                            {format(new Date(apt.date), 'd', { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {format(new Date(apt.date), 'MMM', { locale: es })}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">{apt.type}</p>
                          <p className="text-sm text-muted-foreground">{apt.time}</p>
                          <p className="text-sm text-muted-foreground">{apt.doctor}</p>
                        </div>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">
                        {apt.status}
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
            {pastAppointments.map((apt) => (
              <Card key={apt.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg text-center min-w-[60px]">
                        <p className="text-xl font-bold text-foreground">
                          {format(new Date(apt.date), 'd', { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(new Date(apt.date), 'MMM', { locale: es })}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground mb-1">{apt.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.date), "d 'de' MMMM, yyyy", { locale: es })} - {apt.time}
                        </p>
                        <p className="text-sm text-muted-foreground">{apt.doctor}</p>
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      {apt.status}
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

