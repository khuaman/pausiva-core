"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePatients } from '@/hooks/use-patients';
import { useAppointments } from '@/hooks/use-appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, MessageCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MiPerfil() {
  const { user } = useAuth();
  const { patients, loading: loadingPatient } = usePatients({ 
    id: user?.id,
    autoFetch: !!user?.id 
  });
  const { appointments, loading: loadingAppointments } = useAppointments({ 
    patientId: user?.id,
    autoFetch: !!user?.id
  });

  const patient = patients?.[0];
  
  if (loadingPatient || loadingAppointments) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No se pudo cargar tu perfil</p>
      </div>
    );
  }

  // Find next appointment
  const now = new Date();
  const nextAppointment = appointments
    ?.filter(apt => new Date(apt.scheduledAt) >= now && (apt.status === 'scheduled' || apt.status === 'rescheduled'))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  // Get completed appointments
  const completedAppointments = appointments
    ?.filter(apt => apt.status === 'completed')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3) || [];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={patient.profile.pictureUrl || undefined} alt={patient.profile.fullName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {patient.profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Mi Perfil
            </h1>
            <p className="text-muted-foreground mb-1">{patient.profile.fullName}</p>
            {patient.profile.birthDate && (
              <p className="text-sm text-muted-foreground">
                {Math.floor((new Date().getTime() - new Date(patient.profile.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} años
              </p>
            )}
          </div>
          <Button variant="outline">Editar Información</Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-8 space-y-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle>Mi Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {patient.profile.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Teléfono</p>
                <p className="text-foreground">{patient.profile.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
              <p className="text-foreground">{patient.profile.email}</p>
            </div>
            {patient.metadata.dni && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">DNI</p>
                <p className="text-foreground">{patient.metadata.dni}</p>
              </div>
            )}
            {patient.profile.birthDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Fecha de Nacimiento</p>
                <p className="text-foreground">{format(new Date(patient.profile.birthDate), "d 'de' MMMM, yyyy", { locale: es })}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próxima Cita */}
        {nextAppointment && (
          <Card>
            <CardHeader>
              <CardTitle>Mi Próxima Cita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 bg-accent rounded-lg">
                <Calendar className="h-6 w-6 text-primary mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    {format(new Date(nextAppointment.scheduledAt), "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {format(new Date(nextAppointment.scheduledAt), 'HH:mm', { locale: es })} - {nextAppointment.type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    con {nextAppointment.doctor.fullName}
                  </p>
                </div>
                <Button size="sm" variant="outline">Ver Detalles</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mi Perfil Clínico - Solo si hay datos */}
        {patient.metadata.clinicalProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Mi Perfil Clínico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>Información clínica disponible</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de Consultas (Resumen) */}
        {completedAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mis Consultas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{apt.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.scheduledAt), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      Completada
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

