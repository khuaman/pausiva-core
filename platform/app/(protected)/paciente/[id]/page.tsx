"use client";

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatients } from '@/hooks/use-patients';
import { useAppointments } from '@/hooks/use-appointments';
import { useFollowings } from '@/hooks/use-followings';
import { usePlans } from '@/hooks/use-plans';
import { useParaclinics } from '@/hooks/use-paraclinics';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User,
  FileText,
  AlertCircle,
  Clock,
  MessageSquare,
  Stethoscope,
  Pill,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ApiPlan } from '@/app/api/plans/types';

// Component to display plan row with files
function PlanRow({ plan }: { plan: ApiPlan }) {
  const [files, setFiles] = useState<Array<{ name: string; url: string; size: number | null }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [errorLoadingFiles, setErrorLoadingFiles] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!plan.appointmentId) return;
      
      setLoadingFiles(true);
      setErrorLoadingFiles(false);
      try {
        const response = await fetch(`/api/files?appointmentId=${plan.appointmentId}&category=plan`);
        if (response.ok) {
          const result = await response.json();
          setFiles(result.data || []);
        } else if (response.status === 404 || response.status === 500) {
          // Bucket not found or storage not configured - treat as no files
          setFiles([]);
        } else {
          setErrorLoadingFiles(true);
        }
      } catch (error) {
        console.error('Error fetching plan files:', error);
        setErrorLoadingFiles(true);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [plan.appointmentId]);

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-green-500" />
          <span className="font-medium">Plan de Tratamiento</span>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        {plan.startDate ? (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(plan.startDate), 'PP', { locale: es })}
          </div>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        {plan.endDate ? (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(plan.endDate), 'PP', { locale: es })}
          </div>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        {plan.appointment ? (
          format(new Date(plan.appointment.scheduledAt!), 'PP', { locale: es })
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-4">
        {loadingFiles ? (
          <span className="text-sm text-muted-foreground">Cargando...</span>
        ) : errorLoadingFiles ? (
          <span className="text-sm text-muted-foreground">Error al cargar archivos</span>
        ) : files.length > 0 ? (
          <div className="flex flex-col gap-2">
            {files.map((file, index) => (
              <Button key={index} variant="outline" size="sm" asChild>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  {file.name}
                </a>
              </Button>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sin archivos</span>
        )}
      </td>
    </tr>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all patient-related data
  const { patients, loading: loadingPatient, error: errorPatient } = usePatients({ id: patientId });
  const { appointments, loading: loadingAppointments } = useAppointments({ patientId, limit: 50 });
  const { followings, loading: loadingFollowings } = useFollowings({ patientId, limit: 50 });
  const { plans, loading: loadingPlans } = usePlans({ patientId, limit: 50 });
  const { paraclinics, loading: loadingParaclinics } = useParaclinics({ patientId, limit: 50 });

  const patient = patients[0];
  const loading = loadingPatient || loadingAppointments || loadingFollowings || loadingPlans || loadingParaclinics;

  const handleDeletePatient = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/patients?id=${patientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Paciente eliminado',
          description: 'El paciente ha sido eliminado exitosamente.',
        });
        router.push('/pacientes');
      } else if (response.status === 409 && data.details) {
        // Handle dependency conflict - show detailed message
        toast({
          title: 'No se puede eliminar',
          description: data.error,
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el paciente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al eliminar el paciente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

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
    return type === 'pre_consulta' ? 'Descubrimiento' : 'Consulta';
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
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Paciente
          </Button>
        </div>

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
            <TabsTrigger value="paraclinics">
              <FileText className="h-4 w-4 mr-2" />
              Exámenes ({paraclinics.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                     <th className="px-4 py-3 text-left text-sm font-semibold text-foreground" colSpan={2}>
                      Estadísticas Rápidas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Total de citas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold">{appointments.length}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Seguimientos</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold">{followings.length}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Planes activos</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold">{plans.length}</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium">Seguimientos urgentes</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold text-destructive">
                        {followings.filter(f => f.isUrgent).length}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>


            {/* Recent Activity Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Detalles</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Recent Appointments */}
                  {appointments.slice(0, 3).map((appointment) => (
                    <tr key={appointment.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-medium">{getAppointmentTypeLabel(appointment.type)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {format(new Date(appointment.scheduledAt), "PPP", { locale: es })}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        Dr(a). {appointment.doctor.fullName}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getAppointmentStatusVariant(appointment.status)} className="text-xs">
                          {getAppointmentStatusLabel(appointment.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {/* Recent Followings */}
                  {followings.slice(0, 2).map((following) => (
                    <tr key={following.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className={`h-4 w-4 ${following.isUrgent ? 'text-destructive' : 'text-blue-500'}`} />
                          <span className="font-medium capitalize">Seguimiento</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {format(new Date(following.contactedAt), "PPP", { locale: es })}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {following.type.replace(/_/g, ' ')}
                        {following.summary && (
                          <span className="block text-xs mt-1 line-clamp-1">{following.summary}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {following.isUrgent && (
                          <Badge variant="destructive" className="text-xs">Urgente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {loadingAppointments ? (
                <div className="text-center py-12 text-muted-foreground">
                  Cargando citas...
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay citas registradas
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha y Hora</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Doctor</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Estado</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">{getAppointmentTypeLabel(appointment.type)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div className="font-medium">
                              {format(new Date(appointment.scheduledAt), "EEEE, d 'de' MMMM", { locale: es })}
                            </div>
                            <div className="text-muted-foreground">
                              {format(new Date(appointment.scheduledAt), "h:mm a", { locale: es })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Dr(a). {appointment.doctor.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={getAppointmentStatusVariant(appointment.status)}>
                            {getAppointmentStatusLabel(appointment.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Button variant="outline" size="sm">
                            Ver Detalles
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* Followings Tab */}
          <TabsContent value="followings" className="space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {loadingFollowings ? (
                <div className="text-center py-12 text-muted-foreground">
                  Cargando seguimientos...
                </div>
              ) : followings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay seguimientos registrados
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Canal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Resumen</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Detalles</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followings.map((following) => (
                      <tr 
                        key={following.id} 
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${
                          following.isUrgent ? 'bg-destructive/5' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className={`h-4 w-4 ${following.isUrgent ? 'text-destructive' : 'text-blue-500'}`} />
                            <span className="font-medium capitalize">{following.type.replace(/_/g, ' ')}</span>
                            {following.isUrgent && (
                              <Badge variant="destructive" className="ml-2">Urgente</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {format(new Date(following.contactedAt), "PPP", { locale: es })}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="capitalize">
                            {following.channel}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {following.summary ? (
                            <p className="text-sm line-clamp-2 max-w-md">{following.summary}</p>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          <div>{following.messageCount} mensajes</div>
                          {following.severityScore !== null && (
                            <div>Severidad: {following.severityScore}/10</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {following.transcriptUrl ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={following.transcriptUrl} target="_blank" rel="noopener noreferrer">
                                Ver Transcripción
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {loadingPlans ? (
                <div className="text-center py-12 text-muted-foreground">
                  Cargando planes...
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay planes registrados
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Plan</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha de Inicio</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha de Fin</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Cita Relacionada</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Archivos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <PlanRow key={plan.id} plan={plan} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* Paraclinics Tab */}
          <TabsContent value="paraclinics" className="space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {loadingParaclinics ? (
                <div className="text-center py-12 text-muted-foreground">
                  Cargando exámenes...
                </div>
              ) : paraclinics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay exámenes registrados
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha de Resultado</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Cita Relacionada</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Descripción</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paraclinics.map((paraclinic) => (
                      <tr key={paraclinic.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="capitalize">
                            {paraclinic.type === 'image' ? 'Imagen' : paraclinic.type === 'lab' ? 'Laboratorio' : 'Procedimiento'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {paraclinic.resultDate ? (
                            format(new Date(paraclinic.resultDate), 'PP', { locale: es })
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {paraclinic.appointment ? (
                            format(new Date(paraclinic.appointment.scheduledAt!), 'PP', { locale: es })
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {paraclinic.description || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {paraclinic.fileUrl ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={paraclinic.fileUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Archivo
                              </a>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a {patient?.profile.fullName} y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

