"use client";

import { useMemo, useState } from 'react';
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
import { useDoctors } from '@/hooks/use-doctors';
import { useAppointments } from '@/hooks/use-appointments';
import { useToast } from '@/hooks/use-toast';
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
  Stethoscope,
  CalendarDays,
  CheckCircle2,
  XCircle,
  GraduationCap,
  IdCard,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContactAgentModal } from '@/components/ContactAgentModal';

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedPatientForContact, setSelectedPatientForContact] = useState<{
    id: string;
    name: string;
    phone: string | null;
  } | null>(null);

  // Fetch doctor and their appointments
  const { doctors, loading: loadingDoctor, error: errorDoctor } = useDoctors({ id: doctorId });
  const { appointments, loading: loadingAppointments } = useAppointments({ doctorId, limit: 100 });

  const doctor = doctors[0];
  const loading = loadingDoctor || loadingAppointments;

  const handleDeleteDoctor = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/doctors?id=${doctorId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Doctor eliminado',
          description: 'El doctor ha sido eliminado exitosamente.',
        });
        router.push('/doctores');
      } else if (response.status === 409 && data.details) {
        // Handle dependency conflict
        const details = data.details;
        let message = data.error;
        
        if (details.appointmentsCount) {
          message += ` El doctor tiene ${details.appointmentsCount} cita${details.appointmentsCount > 1 ? 's' : ''} registrada${details.appointmentsCount > 1 ? 's' : ''}.`;
        }
        
        toast({
          title: 'No se puede eliminar',
          description: message,
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el doctor.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al eliminar el doctor.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleOpenContactModal = async (patientId: string, patientName: string) => {
    try {
      // Fetch the patient details to get phone number
      const response = await fetch(`/api/users/patients?id=${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient details');
      }
      const data = await response.json();
      // API returns an array, get the first patient
      const patient = data.data[0];
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      setSelectedPatientForContact({
        id: patient.id,
        name: patient.profile.fullName,
        phone: patient.profile.phone,
      });
      setContactModalOpen(true);
    } catch (error) {
      console.error('[handleOpenContactModal] Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener la información del paciente.',
        variant: 'destructive',
      });
    }
  };

  // Calculate age from birth date
  const age = useMemo(() => {
    if (!doctor?.profile.birthDate) return null;
    const today = new Date();
    const birth = new Date(doctor.profile.birthDate);
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  }, [doctor?.profile.birthDate]);

  // Get unique patients from appointments
  const uniquePatients = useMemo(() => {
    const patientMap = new Map();
    appointments.forEach((appointment) => {
      if (appointment.patient && !patientMap.has(appointment.patient.id)) {
        patientMap.set(appointment.patient.id, appointment.patient);
      }
    });
    return Array.from(patientMap.values());
  }, [appointments]);

  // Appointment statistics
  const appointmentStats = useMemo(() => {
    const stats = {
      total: appointments.length,
      completed: 0,
      scheduled: 0,
      cancelled: 0,
      noShow: 0,
      preConsulta: 0,
      consulta: 0,
    };

    appointments.forEach((appointment) => {
      // Count by status
      if (appointment.status === 'completed') stats.completed++;
      else if (appointment.status === 'scheduled') stats.scheduled++;
      else if (appointment.status === 'cancelled') stats.cancelled++;
      else if (appointment.status === 'no_show') stats.noShow++;

      // Count by type
      if (appointment.type === 'pre_consulta') stats.preConsulta++;
      else if (appointment.type === 'consulta') stats.consulta++;
    });

    return stats;
  }, [appointments]);

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

  if (errorDoctor) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar el doctor: {errorDoctor.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && !doctor) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12 text-muted-foreground">
          Cargando información del doctor...
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No se encontró el doctor</AlertDescription>
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
            Eliminar Doctor
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Avatar className="h-[160px] w-[160px] rounded-[160px]">
            <AvatarImage src={doctor.profile.pictureUrl || undefined} alt={doctor.profile.fullName} />
            <AvatarFallback>
              {doctor.profile.fullName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-3xl font-serif font-bold text-foreground">
                Dr(a). {doctor.profile.fullName}
              </h1>
              <Badge variant="outline" className="w-fit">
                <Stethoscope className="h-3 w-3 mr-1" />
                {doctor.metadata.specialty}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                <span>CMP: {doctor.metadata.cmp}</span>
              </div>
              {doctor.metadata.dni && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>DNI: {doctor.metadata.dni}</span>
                </div>
              )}
              {age && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{age} años</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{doctor.profile.email}</span>
              </div>
              {doctor.profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{doctor.profile.phone}</span>
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
            <TabsTrigger value="patients">
              <User className="h-4 w-4 mr-2" />
              Pacientes ({uniquePatients.length})
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <Activity className="h-4 w-4 mr-2" />
              Estadísticas
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
                      Estadísticas Generales
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
                      <span className="text-2xl font-bold">{appointmentStats.total}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Citas completadas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold text-green-500">{appointmentStats.completed}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Citas programadas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold text-blue-500">{appointmentStats.scheduled}</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pacientes únicos</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold">{uniquePatients.length}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Professional Info Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground" colSpan={2}>
                      Información Profesional
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-medium text-sm w-1/3">Especialidad</td>
                    <td className="px-4 py-4 text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        {doctor.metadata.specialty}
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-medium text-sm w-1/3">Colegio Médico del Perú</td>
                    <td className="px-4 py-4 text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <IdCard className="h-5 w-5 text-primary" />
                        {doctor.metadata.cmp}
                      </div>
                    </td>
                  </tr>
                  {doctor.metadata.dni && (
                    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 font-medium text-sm w-1/3">DNI</td>
                      <td className="px-4 py-4 text-lg font-semibold">{doctor.metadata.dni}</td>
                    </tr>
                  )}
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-medium text-sm w-1/3">Miembro desde</td>
                    <td className="px-4 py-4 text-lg font-semibold">
                      {format(new Date(doctor.profile.createdAt), 'PP', { locale: es })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recent Appointments Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {appointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay citas registradas
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Paciente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 5).map((appointment) => (
                      <tr key={appointment.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
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
                          {appointment.patient?.fullName || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={getAppointmentStatusVariant(appointment.status)} className="text-xs">
                            {getAppointmentStatusLabel(appointment.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Paciente</th>
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
                            <span className="text-sm">{appointment.patient?.fullName || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={getAppointmentStatusVariant(appointment.status)}>
                            {getAppointmentStatusLabel(appointment.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenContactModal(appointment.patient.id, appointment.patient.fullName)}
                              className="gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Checkeo
                            </Button>
                            <Button variant="outline" size="sm">
                              Ver Detalles
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {uniquePatients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay pacientes registrados
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Paciente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Total de Citas</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniquePatients.map((patient: any) => {
                      // Count appointments for this patient
                      const patientAppointments = appointments.filter(
                        (apt) => apt.patient?.id === patient.id
                      );
                      
                      return (
                        <tr key={patient.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={patient.pictureUrl || undefined} alt={patient.fullName} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {patient.fullName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{patient.fullName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {patient.email}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline">
                              {patientAppointments.length} cita{patientAppointments.length !== 1 ? 's' : ''}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/paciente/${patient.id}`)}
                            >
                              Ver Perfil
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            {/* By Status Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground" colSpan={2}>
                      Por Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Completadas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.completed}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Programadas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.scheduled}</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Canceladas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.cancelled}</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">No asistió</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.noShow}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* By Type Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground" colSpan={2}>
                      Por Tipo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Descubrimientos</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.preConsulta}</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Consultas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.consulta}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground" colSpan={2}>
                      Totales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Total citas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{appointmentStats.total}</span>
                    </td>
                  </tr>
                  <tr className={`${appointmentStats.total > 0 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pacientes únicos</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-lg">{uniquePatients.length}</span>
                    </td>
                  </tr>
                  {appointmentStats.total > 0 && (
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Tasa completadas</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-bold text-lg">
                          {Math.round((appointmentStats.completed / appointmentStats.total) * 100)}%
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente al Dr(a). {doctor?.profile.fullName} y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoctor}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contact Agent Modal */}
      {selectedPatientForContact && (
        <ContactAgentModal
          open={contactModalOpen}
          onOpenChange={setContactModalOpen}
          patientId={selectedPatientForContact.id}
          patientName={selectedPatientForContact.name}
          patientPhone={selectedPatientForContact.phone}
        />
      )}
    </div>
  );
}

