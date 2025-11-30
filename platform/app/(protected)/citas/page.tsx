"use client";

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertCircle, Edit2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppointments } from '@/hooks/use-appointments';
import { toast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type {
  ApiAppointmentDetail,
  ApiAppointmentSummary,
} from '@/app/api/appointments/types';
import type { AppointmentStatus } from '@/utils/types/appointments';
import { APPOINTMENT_STATUS_VALUES } from '@/utils/types/appointments';

export default function Citas() {
  const router = useRouter();
  const today = new Date();
  const { appointments, loading, error, refetch } = useAppointments({ limit: 100 });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<ApiAppointmentDetail | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatusAppointment, setSelectedStatusAppointment] = useState<ApiAppointmentSummary | null>(null);
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('scheduled');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusClassMap: Record<AppointmentStatus, string> = {
    scheduled: 'bg-warning/10 text-warning border-warning/20',
    rescheduled: 'bg-warning/10 text-warning border-warning/20',
    completed: 'bg-success/10 text-success border-success/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    no_show: 'bg-muted text-muted-foreground border-border',
  };

  const { scheduledAppointments, completedAppointments, cancelledAppointments } = useMemo(() => {
    const scheduled: ApiAppointmentSummary[] = [];
    const completed: ApiAppointmentSummary[] = [];
    const cancelled: ApiAppointmentSummary[] = [];

    appointments.forEach((appointment) => {
      switch (appointment.status) {
        case 'scheduled':
        case 'rescheduled':
          scheduled.push(appointment);
          break;
        case 'completed':
          completed.push(appointment);
          break;
        case 'cancelled':
        case 'no_show':
          cancelled.push(appointment);
          break;
      }
    });

    const asc = (a: ApiAppointmentSummary, b: ApiAppointmentSummary) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    const desc = (a: ApiAppointmentSummary, b: ApiAppointmentSummary) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();

    return {
      scheduledAppointments: scheduled.sort(asc),
      completedAppointments: completed.sort(desc),
      cancelledAppointments: cancelled.sort(desc),
    };
  }, [appointments]);

  const formatAppointmentType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const statusLabels: Record<AppointmentStatus, string> = {
    scheduled: 'Programada',
    rescheduled: 'Reprogramada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No Asistió',
  };

  const formatAppointmentStatus = (status: AppointmentStatus) =>
    statusLabels[status] || status;

  const handleOpenDetail = useCallback(
    async (appointmentId: string) => {
      setDetailDialogOpen(true);
      if (selectedAppointmentDetail?.id === appointmentId) {
        return;
      }

      setSelectedAppointmentId(appointmentId);
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await fetch(`/api/appointments/${appointmentId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch appointment: ${response.status}`);
        }
        const result = await response.json();
        setSelectedAppointmentDetail(result.data);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Unknown error');
        setSelectedAppointmentDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [selectedAppointmentDetail?.id]
  );

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedAppointmentId(null);
    setSelectedAppointmentDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleOpenStatusDialog = (appointment: ApiAppointmentSummary) => {
    setSelectedStatusAppointment(appointment);
    setNewStatus(appointment.status);
    setStatusDialogOpen(true);
  };

  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedStatusAppointment(null);
    setNewStatus('scheduled');
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatusAppointment) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/appointments/${selectedStatusAppointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el estado');
      }

      toast({
        title: 'Estado actualizado',
        description: 'El estado de la cita se actualizó correctamente.',
      });

      handleCloseStatusDialog();
      await refetch();
    } catch (error) {
      toast({
        title: 'Error al actualizar',
        description: error instanceof Error ? error.message : 'Error inesperado.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderAppointmentTable = (appointments: ApiAppointmentSummary[]) => {
    if (appointments.length === 0) return null;

    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Paciente
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Hora
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Profesional
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
            {appointments.map((apt) => {
              const appointmentDate = new Date(apt.scheduledAt);
              const formattedDate = format(appointmentDate, "d 'de' MMM", { locale: es });
              const formattedTime = format(appointmentDate, 'HH:mm');
              const initials = apt.patient.fullName
                .split(' ')
                .map((name) => (name ? name[0] : ''))
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const isLoadingDetail = detailLoading && selectedAppointmentId === apt.id;

              return (
                <tr 
                  key={apt.id} 
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={apt.patient.pictureUrl ?? undefined} alt={apt.patient.fullName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{apt.patient.fullName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {formatAppointmentType(apt.type)}
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{formattedDate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{formattedTime}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-foreground">
                    {apt.doctor.fullName}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant="outline"
                      className={`text-xs border ${statusClassMap[apt.status] ?? 'bg-muted text-muted-foreground border-border'}`}
                    >
                      {formatAppointmentStatus(apt.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDetail(apt.id)}
                        disabled={isLoadingDetail}
                      >
                        {isLoadingDetail ? 'Cargando...' : 'Ver Detalles'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenStatusDialog(apt)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-gradient-to-br from-background via-background to-primary/5 border-b border-border px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-1">
              Gestión de Citas
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground capitalize">
              {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </header>

      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDetailDialogOpen(true);
          } else {
            handleCloseDetail();
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Detalle de la cita</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-6 text-center text-muted-foreground">Cargando información...</div>
          ) : detailError ? (
            <div className="py-4 text-sm text-destructive">{detailError}</div>
          ) : selectedAppointmentDetail ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</p>
                <Badge
                  variant="outline"
                  className={`w-fit text-xs border ${statusClassMap[selectedAppointmentDetail.status] ?? 'bg-muted text-muted-foreground border-border'}`}
                >
                  {formatAppointmentStatus(selectedAppointmentDetail.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Paciente</p>
                  <p className="font-semibold text-foreground">{selectedAppointmentDetail.patient.profile.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointmentDetail.patient.profile.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Profesional</p>
                  <p className="font-semibold text-foreground">{selectedAppointmentDetail.doctor.profile.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointmentDetail.doctor.metadata.specialty}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{format(new Date(selectedAppointmentDetail.scheduledAt), "EEEE, d 'de' MMMM", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{format(new Date(selectedAppointmentDetail.scheduledAt), 'HH:mm')}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm text-foreground bg-muted/40 rounded-md p-3">
                  {selectedAppointmentDetail.notes || 'Sin notas registradas'}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground text-sm">
              Selecciona una cita para ver su detalle.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Actualizar Estado de Cita</DialogTitle>
            <DialogDescription>
              Cambia el estado de la cita según su progreso o situación.
            </DialogDescription>
          </DialogHeader>

          {selectedStatusAppointment && (
            <div className="space-y-5">
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {selectedStatusAppointment.patient.fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedStatusAppointment.scheduledAt), "d 'de' MMMM, HH:mm", { locale: es })}
                </p>
                <Badge
                  variant="outline"
                  className={`text-xs border ${statusClassMap[selectedStatusAppointment.status] ?? 'bg-muted text-muted-foreground border-border'}`}
                >
                  Estado actual: {formatAppointmentStatus(selectedStatusAppointment.status)}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-select">Nuevo Estado</Label>
                <Select value={newStatus} onValueChange={(value: AppointmentStatus) => setNewStatus(value)}>
                  <SelectTrigger id="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUS_VALUES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatAppointmentStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecciona el nuevo estado para esta cita médica.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseStatusDialog}
              disabled={updatingStatus}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updatingStatus || newStatus === selectedStatusAppointment?.status}
              className="w-full sm:w-auto"
            >
              {updatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Estado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudieron cargar las citas: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de Citas */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Lista de Citas</h2>
          <Tabs defaultValue="scheduled" className="space-y-6 sm:space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-lg h-auto sm:h-12 bg-muted/50">
              <TabsTrigger value="scheduled" className="text-xs sm:text-sm lg:text-base font-medium py-2 sm:py-0">
                <span className="hidden sm:inline">Programadas</span>
                <span className="sm:hidden">Prog</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{scheduledAppointments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm lg:text-base font-medium py-2 sm:py-0">
                <span className="hidden sm:inline">Completadas</span>
                <span className="sm:hidden">Comp</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{completedAppointments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm lg:text-base font-medium py-2 sm:py-0">
                <span className="hidden sm:inline">Canceladas</span>
                <span className="sm:hidden">Canc</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{cancelledAppointments.length}</span>
              </TabsTrigger>
            </TabsList>

          <TabsContent value="scheduled">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Cargando citas programadas...
              </div>
            ) : scheduledAppointments.length > 0 ? (
              renderAppointmentTable(scheduledAppointments)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay citas programadas
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Cargando citas completadas...
              </div>
            ) : completedAppointments.length > 0 ? (
              renderAppointmentTable(completedAppointments)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay citas completadas
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Cargando citas canceladas...
              </div>
            ) : cancelledAppointments.length > 0 ? (
              renderAppointmentTable(cancelledAppointments)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay citas canceladas
              </div>
            )}
          </TabsContent>
        </Tabs>
        </section>
      </main>
    </div>
  );
}

