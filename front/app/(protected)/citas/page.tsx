"use client";

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppointments } from '@/hooks/use-appointments';
import type {
  ApiAppointmentDetail,
  ApiAppointmentSummary,
} from '@/app/api/appointments/types';
import type { AppointmentStatus } from '@/utils/types/appointments';

export default function Citas() {
  const router = useRouter();
  const today = new Date();
  const { appointments, loading, error } = useAppointments({ limit: 100 });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<ApiAppointmentDetail | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

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

  const renderAppointmentCard = (apt: ApiAppointmentSummary) => {
    const appointmentDate = new Date(apt.scheduledAt);
    const formattedDate = format(appointmentDate, "d 'de' MMMM", { locale: es });
    const formattedTime = format(appointmentDate, 'HH:mm');
    const initials = apt.patient.fullName
      .split(' ')
      .map((name) => (name ? name[0] : ''))
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const isLoadingDetail = detailLoading && selectedAppointmentId === apt.id;

    return (
      <Card key={apt.id} className="card-hover group shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-border flex-shrink-0">
              <AvatarImage src={apt.patient.pictureUrl ?? undefined} alt={apt.patient.fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-base sm:text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-3 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground">
                  {apt.patient.fullName}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-xs border ${statusClassMap[apt.status] ?? 'bg-muted text-muted-foreground border-border'}`}
                >
                  {apt.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                {formatAppointmentType(apt.type)}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="font-medium truncate">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="font-medium">{formattedTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                <span className="text-muted-foreground">Profesional:</span>
                <span className="font-semibold text-foreground">{apt.doctor.fullName}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDetail(apt.id)}
                disabled={isLoadingDetail}
                className="w-full sm:w-auto shrink-0"
              >
                {isLoadingDetail ? 'Cargando...' : 'Ver Detalles'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push(`/paciente/${apt.patient.id}`)}
                className="w-full sm:w-auto shrink-0"
              >
                Ver Paciente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
                  {selectedAppointmentDetail.status.replace('_', ' ').toUpperCase()}
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

        {/* Vista de Calendario - Placeholder */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Vista de Calendario</h2>
          <Card className="shadow-sm border-dashed border-2">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-4">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-semibold text-foreground mb-2">
                Vista de Calendario
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                Próximamente podrás visualizar todas tus citas en un calendario interactivo mensual
              </p>
            </CardContent>
          </Card>
        </section>

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

          <TabsContent value="scheduled" className="space-y-4">
            {loading ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground">
                  Cargando citas programadas...
                </CardContent>
              </Card>
            ) : scheduledAppointments.length > 0 ? (
              scheduledAppointments.map(renderAppointmentCard)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No hay citas programadas</h3>
                  <p className="text-muted-foreground">No se han encontrado citas con estado programado</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {loading ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground">
                  Cargando citas completadas...
                </CardContent>
              </Card>
            ) : completedAppointments.length > 0 ? (
              completedAppointments.map(renderAppointmentCard)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No hay citas completadas</h3>
                  <p className="text-muted-foreground">No se ha encontrado historial de citas completadas</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {loading ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground">
                  Cargando citas canceladas...
                </CardContent>
              </Card>
            ) : cancelledAppointments.length > 0 ? (
              cancelledAppointments.map(renderAppointmentCard)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No hay citas canceladas</h3>
                  <p className="text-muted-foreground">No se ha encontrado historial de citas canceladas</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </section>
      </main>
    </div>
  );
}

