"use client";

import { useAuth } from '@/contexts/AuthContext';
import { getPatientById } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, MessageCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MiPerfil() {
  const { user } = useAuth();
  
  // En producción, esto vendría del ID del usuario autenticado
  // Por ahora usamos el paciente mock P001 (Carmen López)
  const patient = getPatientById('P001');

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No se pudo cargar tu perfil</p>
      </div>
    );
  }

  const roadmapSteps = [
    { key: 'preConsultation', label: 'Pre-consulta', icon: MessageCircle, color: 'text-primary' },
    { key: 'virtualConsultation', label: 'Consulta Virtual', icon: Calendar, color: 'text-primary' },
    { key: 'diagnosis', label: 'Diagnóstico', icon: CheckCircle, color: 'text-primary' },
    { key: 'exams', label: 'Exámenes', icon: AlertCircle, color: 'text-primary' },
    { key: 'followUp', label: 'Seguimiento', icon: Clock, color: 'text-primary' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={patient.avatar} alt={patient.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Mi Perfil
            </h1>
            <p className="text-muted-foreground mb-1">{patient.name}</p>
            <p className="text-sm text-muted-foreground">{patient.age} años</p>
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
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Teléfono</p>
              <p className="text-foreground">{patient.demographics.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
              <p className="text-foreground">{patient.demographics.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Contacto de Emergencia</p>
              <p className="text-foreground">{patient.demographics.emergencyContact}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Dirección</p>
              <p className="text-foreground">{patient.demographics.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Próxima Cita */}
        {patient.nextAppointment && (
          <Card>
            <CardHeader>
              <CardTitle>Mi Próxima Cita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 bg-accent rounded-lg">
                <Calendar className="h-6 w-6 text-primary mt-1" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    {format(new Date(patient.nextAppointment.date), "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {patient.nextAppointment.time} - {patient.nextAppointment.type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    con {patient.nextAppointment.doctor}
                  </p>
                </div>
                <Button size="sm" variant="outline">Ver Detalles</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mi Roadmap (Simplificado) */}
        <Card>
          <CardHeader>
            <CardTitle>Mi Proceso de Atención</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between">
              {roadmapSteps.map((step, index) => {
                const isCompleted = patient.roadmap[step.key as keyof typeof patient.roadmap];
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-600'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className={`text-xs text-center font-medium ${
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                    {index < roadmapSteps.length - 1 && (
                      <div className={`absolute h-0.5 top-6 left-1/2 -z-10 ${
                        isCompleted && patient.roadmap[roadmapSteps[index + 1].key as keyof typeof patient.roadmap]
                          ? 'bg-primary'
                          : 'bg-gray-200'
                      }`} style={{ width: '100%' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Etapas completadas con descripción breve */}
            <div className="space-y-4 pt-4">
              {patient.roadmap.diagnosis && (
                <div className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">Diagnóstico Actual</p>
                  </div>
                  <p className="text-sm text-foreground">{patient.roadmap.diagnosis.diagnosis}</p>
                </div>
              )}

              {patient.roadmap.followUp && patient.roadmap.followUp.length > 0 && (
                <div className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">Último Seguimiento</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {format(new Date(patient.roadmap.followUp[0].date), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                  <Badge className={
                    patient.roadmap.followUp[0].improvement === 'mejora' 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-info text-info-foreground'
                  }>
                    {patient.roadmap.followUp[0].improvement === 'mejora' ? 'En mejora' : 'Estable'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Historial de Consultas (Resumen) */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Consultas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patient.appointments.filter(apt => apt.status === 'completada').slice(0, 3).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{apt.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(apt.date), "d 'de' MMMM, yyyy", { locale: es })}
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
      </main>
    </div>
  );
}

