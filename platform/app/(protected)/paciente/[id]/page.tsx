"use client";

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatients } from '@/hooks/use-patients';
import { useAppointments } from '@/hooks/use-appointments';
import { useFollowings } from '@/hooks/use-followings';
import { usePlans } from '@/hooks/use-plans';
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User,
  FileText,
  Activity,
  AlertCircle,
  Clock,
  MessageSquare,
  Stethoscope,
  Pill,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  // Fetch all patient-related data
  const { patients, loading: loadingPatient, error: errorPatient } = usePatients({ id: patientId });
  const { appointments, loading: loadingAppointments } = useAppointments({ patientId, limit: 50 });
  const { followings, loading: loadingFollowings } = useFollowings({ patientId, limit: 50 });
  const { plans, loading: loadingPlans } = usePlans({ patientId, limit: 50 });

  const patient = patients[0];
  const loading = loadingPatient || loadingAppointments || loadingFollowings || loadingPlans;

  // Calculate age from birth date
  const age = useMemo(() => {
    if (!patient?.profile.birthDate) return null;
    const today = new Date();
    const birth = new Date(patient.profile.birthDate);
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  }, [patient?.profile.birthDate]);

  // Get clinical profile
  const clinicalProfile = useMemo(() => {
    if (!patient?.metadata.clinicalProfile) return null;
    return patient.metadata.clinicalProfile as any;
  }, [patient?.metadata.clinicalProfile]);

  // Get appointment status badge variant
  const getAppointmentStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'cancelled':
      case 'no_show':
        return 'destructive';
      case 'rescheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Get appointment status label
  const getAppointmentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Completada',
      scheduled: 'Programada',
      cancelled: 'Cancelada',
      no_show: 'No asistió',
      rescheduled: 'Reprogramada',
    };
    return labels[status] || status;
  };

  // Get appointment type label
  const getAppointmentTypeLabel = (type: string) => {
    return type === 'pre_consulta' ? 'Pre-consulta' : 'Consulta';
  };

  if (errorPatient) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar el paciente: {errorPatient.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && !patient) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12 text-muted-foreground">
          Cargando información del paciente...
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No se encontró el paciente</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar className="h-[160px] w-[160px] rounded-[160px]">
            <AvatarImage src={patient.profile.pictureUrl || undefined} alt={patient.profile.fullName} />
            <AvatarFallback>
              {patient.profile.fullName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-3xl font-serif font-bold text-foreground">
                {patient.profile.fullName}
              </h1>
              <Badge variant="outline" className="w-fit">
                DNI: {patient.metadata.dni}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground">
              {age && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{age} años</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{patient.profile.email}</span>
              </div>
              {patient.profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{patient.profile.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="h-4 w-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="h-4 w-4 mr-2" />
              Citas ({appointments.length})
            </TabsTrigger>
            <TabsTrigger value="followings">
              <MessageSquare className="h-4 w-4 mr-2" />
              Seguimientos ({followings.length})
            </TabsTrigger>
            <TabsTrigger value="plans">
              <Stethoscope className="h-4 w-4 mr-2" />
              Planes ({plans.length})
            </TabsTrigger>
            <TabsTrigger value="clinical">
              <Activity className="h-4 w-4 mr-2" />
              Perfil Clínico
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas Rápidas</CardTitle>
                  <CardDescription>Resumen de la actividad del paciente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total de citas</span>
                    </div>
                    <span className="text-2xl font-bold">{appointments.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Seguimientos</span>
                    </div>
                    <span className="text-2xl font-bold">{followings.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Planes activos</span>
                    </div>
                    <span className="text-2xl font-bold">{plans.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">Seguimientos urgentes</span>
                    </div>
                    <span className="text-2xl font-bold text-destructive">
                      {followings.filter(f => f.isUrgent).length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Clinical Summary */}
              {clinicalProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen Clínico</CardTitle>
                    <CardDescription>Información médica relevante</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {clinicalProfile.menopause_stage && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Etapa de Menopausia</div>
                        <div className="text-lg font-semibold capitalize">
                          {clinicalProfile.menopause_stage.replace(/_/g, ' ')}
                        </div>
                      </div>
                    )}
                    {clinicalProfile.symptom_score !== undefined && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Puntuación de Síntomas</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                clinicalProfile.symptom_score >= 7 ? 'bg-red-500' :
                                clinicalProfile.symptom_score >= 4 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(clinicalProfile.symptom_score * 10, 100)}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold">{clinicalProfile.symptom_score}/10</span>
                        </div>
                      </div>
                    )}
                    {clinicalProfile.risk_factors && clinicalProfile.risk_factors.length > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Factores de Riesgo</div>
                        <div className="flex flex-wrap gap-2">
                          {clinicalProfile.risk_factors.map((factor: string) => (
                            <Badge key={factor} variant="outline" className="capitalize">
                              {factor.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimas interacciones y eventos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Recent Appointments */}
                  {appointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {getAppointmentTypeLabel(appointment.type)}
                          </span>
                          <Badge variant={getAppointmentStatusVariant(appointment.status)} className="text-xs">
                            {getAppointmentStatusLabel(appointment.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.scheduledAt), "PPP 'a las' p", { locale: es })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dr(a). {appointment.doctor.fullName}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Recent Followings */}
                  {followings.slice(0, 2).map((following) => (
                    <div key={following.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className={`rounded-full p-2 ${following.isUrgent ? 'bg-destructive/10' : 'bg-blue-500/10'}`}>
                        <MessageSquare className={`h-4 w-4 ${following.isUrgent ? 'text-destructive' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">
                            Seguimiento: {following.type.replace(/_/g, ' ')}
                          </span>
                          {following.isUrgent && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(following.contactedAt), "PPP 'a las' p", { locale: es })}
                        </p>
                        {following.summary && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {following.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Citas</CardTitle>
                <CardDescription>
                  Todas las citas médicas del paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando citas...
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay citas registradas
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex flex-col sm:flex-row gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                            <Calendar className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {getAppointmentTypeLabel(appointment.type)}
                            </h3>
                            <Badge variant={getAppointmentStatusVariant(appointment.status)}>
                              {getAppointmentStatusLabel(appointment.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" />
                              <span>
                                {format(new Date(appointment.scheduledAt), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(appointment.scheduledAt), "h:mm a", { locale: es })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Dr(a). {appointment.doctor.fullName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Button variant="outline" size="sm">
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Followings Tab */}
          <TabsContent value="followings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seguimientos</CardTitle>
                <CardDescription>
                  Historial de seguimientos e interacciones con el paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFollowings ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando seguimientos...
                  </div>
                ) : followings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay seguimientos registrados
                  </div>
                ) : (
                  <div className="space-y-4">
                    {followings.map((following) => (
                      <div
                        key={following.id}
                        className={`flex flex-col gap-4 p-4 border rounded-lg ${
                          following.isUrgent
                            ? 'border-destructive bg-destructive/5'
                            : 'border-border hover:bg-muted/30'
                        } transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`rounded-full p-2 flex-shrink-0 ${
                              following.isUrgent ? 'bg-destructive/10' : 'bg-blue-500/10'
                            }`}>
                              <MessageSquare className={`h-5 w-5 ${
                                following.isUrgent ? 'text-destructive' : 'text-blue-500'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold capitalize">
                                  {following.type.replace(/_/g, ' ')}
                                </h3>
                                {following.isUrgent && (
                                  <Badge variant="destructive">Urgente</Badge>
                                )}
                                <Badge variant="outline" className="capitalize">
                                  {following.channel}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {format(new Date(following.contactedAt), "PPP 'a las' p", { locale: es })}
                              </div>
                              {following.summary && (
                                <p className="text-sm mt-2">{following.summary}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{following.messageCount} mensajes</span>
                                {following.severityScore !== null && (
                                  <span>Severidad: {following.severityScore}/10</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {following.transcriptUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={following.transcriptUrl} target="_blank" rel="noopener noreferrer">
                                Ver Transcripción
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Planes de Tratamiento</CardTitle>
                <CardDescription>
                  Planes médicos y tratamientos asignados al paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPlans ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando planes...
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay planes registrados
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex flex-col gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-full p-2 bg-green-500/10 flex-shrink-0">
                            <Pill className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold mb-2">Plan de Tratamiento</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
                              {plan.startDate && (
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4" />
                                  <span>
                                    Inicio: {format(new Date(plan.startDate), 'PP', { locale: es })}
                                  </span>
                                </div>
                              )}
                              {plan.endDate && (
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4" />
                                  <span>
                                    Fin: {format(new Date(plan.endDate), 'PP', { locale: es })}
                                  </span>
                                </div>
                              )}
                            </div>
                            {plan.plan && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-md">
                                <pre className="text-sm whitespace-pre-wrap font-mono">
                                  {JSON.stringify(plan.plan, null, 2)}
                                </pre>
                              </div>
                            )}
                            {plan.appointment && (
                              <div className="mt-3 text-sm text-muted-foreground">
                                Relacionado con cita del{' '}
                                {format(new Date(plan.appointment.scheduledAt!), 'PP', { locale: es })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinical Profile Tab */}
          <TabsContent value="clinical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Perfil Clínico Completo</CardTitle>
                <CardDescription>
                  Información médica detallada del paciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clinicalProfile ? (
                  <div className="space-y-6">
                    {/* Menopause Stage */}
                    {clinicalProfile.menopause_stage && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                          ETAPA DE MENOPAUSIA
                        </h3>
                        <p className="text-lg font-medium capitalize">
                          {clinicalProfile.menopause_stage.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Symptom Score */}
                    {clinicalProfile.symptom_score !== undefined && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          PUNTUACIÓN DE SÍNTOMAS
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full transition-all ${
                                clinicalProfile.symptom_score >= 7 ? 'bg-red-500' :
                                clinicalProfile.symptom_score >= 4 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(clinicalProfile.symptom_score * 10, 100)}%` }}
                            />
                          </div>
                          <span className="text-2xl font-bold">{clinicalProfile.symptom_score}/10</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {clinicalProfile.symptom_score >= 7 && 'Síntomas severos - Requiere atención prioritaria'}
                          {clinicalProfile.symptom_score >= 4 && clinicalProfile.symptom_score < 7 && 'Síntomas moderados'}
                          {clinicalProfile.symptom_score < 4 && 'Síntomas leves'}
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Risk Factors */}
                    {clinicalProfile.risk_factors && clinicalProfile.risk_factors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          FACTORES DE RIESGO
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {clinicalProfile.risk_factors.map((factor: string) => (
                            <Badge key={factor} variant="outline" className="capitalize text-sm py-1">
                              {factor.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Full Clinical Profile JSON */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                        PERFIL COMPLETO (JSON)
                      </h3>
                      <div className="p-4 bg-muted/50 rounded-md overflow-auto">
                        <pre className="text-xs font-mono">
                          {JSON.stringify(clinicalProfile, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay información clínica disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

