"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPatients } from '@/data/mockData';
import { Calendar, Clock, Plus, Video, Building, MapPin, AlertCircle } from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

export default function Citas() {
  const router = useRouter();
  const today = new Date();
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    type: '',
    locationType: 'virtual' as 'virtual' | 'presencial',
    location: '',
    doctor: '',
    notes: ''
  });

  // Recopilar todas las citas
  const allAppointments = mockPatients.flatMap((patient) =>
    patient.appointments.map((apt) => ({
      ...apt,
      patient,
    }))
  );

  // Filtrar citas
  const upcomingAppointments = allAppointments
    .filter((apt) => isAfter(new Date(apt.date), today) || apt.date === today.toISOString().split('T')[0])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastAppointments = allAppointments
    .filter((apt) => isBefore(new Date(apt.date), today) && apt.date !== today.toISOString().split('T')[0])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const todayAppointments = allAppointments.filter(
    (apt) => apt.date === today.toISOString().split('T')[0]
  );

  const handleSubmitAppointment = () => {
    if (!formData.patientId || !formData.date || !formData.time || !formData.type || !formData.doctor) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    // Aquí se guardaría la cita en la base de datos
    console.log('Nueva cita:', formData);
    
    toast({
      title: "Cita agendada exitosamente",
      description: `Cita programada para ${format(new Date(formData.date), "d 'de' MMMM", { locale: es })} a las ${formData.time}`,
    });

    setShowNewAppointmentModal(false);
    setFormData({
      patientId: '',
      date: '',
      time: '',
      type: '',
      locationType: 'virtual',
      location: '',
      doctor: '',
      notes: ''
    });
  };

  const doctors = [
    'Dra. María González',
    'Lic. Ana Torres',
    'Psic. Laura Ramírez'
  ];

  const appointmentTypes = [
    'Consulta Virtual Ginecológica',
    'Consulta Nutricional',
    'Consulta Psicológica',
    'Consulta de seguimiento',
    'Primera consulta'
  ];

  const locations = [
    'Clínica Pausiva - San Isidro',
    'Clínica Pausiva - Miraflores',
    'Videollamada'
  ];

  const renderAppointmentCard = (apt: any) => (
    <Card key={apt.id} className="card-hover group shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-border flex-shrink-0">
            <AvatarImage src={apt.patient.avatar} alt={apt.patient.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-base sm:text-lg font-semibold">
              {apt.patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          {/* Patient Info */}
          <div className="flex-1 min-w-0 space-y-3 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground">
                {apt.patient.name}
              </h3>
              <Badge
                variant={apt.status === 'completada' ? 'default' : 'secondary'}
                className={`text-xs ${
                  apt.status === 'completada'
                    ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                    : apt.status === 'pendiente'
                    ? 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-xs">
                {apt.locationType === 'virtual' ? (
                  <>
                    <Video className="h-3 w-3" />
                    <span className="hidden sm:inline">Virtual</span>
                  </>
                ) : (
                  <>
                    <Building className="h-3 w-3" />
                    <span className="hidden sm:inline">Presencial</span>
                  </>
                )}
              </Badge>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground font-medium">{apt.type}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <span className="font-medium truncate">{format(new Date(apt.date), "d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <span className="font-medium">{apt.time}</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground sm:col-span-2">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <span className="font-medium truncate">{apt.location || 'Ubicación no especificada'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
              <span className="text-muted-foreground">Doctor:</span>
              <span className="font-semibold text-foreground">{apt.doctor}</span>
            </div>

            {/* Symptoms - if completed */}
            {apt.symptoms && apt.symptoms.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sintomatología:</p>
                </div>
                <div className="flex flex-wrap gap-2 ml-0 sm:ml-6">
                  {apt.symptoms.slice(0, 3).map((symptom: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {symptom}
                    </Badge>
                  ))}
                  {apt.symptoms.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{apt.symptoms.length - 3} más
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => router.push(`/paciente/${apt.patient.id}`)}
            className="w-full sm:w-auto shrink-0 group-hover:border-primary group-hover:text-primary transition-all"
          >
            Ver Paciente
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
          <Button 
            size="lg" 
            className="shadow-lg w-full sm:w-auto"
            onClick={() => setShowNewAppointmentModal(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </header>

      {/* Modal de Nueva Cita */}
      <Dialog open={showNewAppointmentModal} onOpenChange={setShowNewAppointmentModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Agendar Nueva Cita</DialogTitle>
            <DialogDescription>
              Completa los datos para agendar una nueva cita médica
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Paciente */}
            <div className="grid gap-2">
              <Label htmlFor="patient" className="text-sm font-semibold">
                Paciente <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.patientId} onValueChange={(value) => setFormData({...formData, patientId: value})}>
                <SelectTrigger id="patient">
                  <SelectValue placeholder="Seleccionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {mockPatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.age} años
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date" className="text-sm font-semibold">
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time" className="text-sm font-semibold">
                  Hora <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                />
              </div>
            </div>

            {/* Tipo de Consulta */}
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-sm font-semibold">
                Tipo de Consulta <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Seleccionar tipo de consulta" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Atención */}
            <div className="grid gap-2">
              <Label className="text-sm font-semibold">
                Tipo de Atención <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="locationType"
                    value="virtual"
                    checked={formData.locationType === 'virtual'}
                    onChange={(e) => setFormData({
                      ...formData, 
                      locationType: e.target.value as 'virtual' | 'presencial',
                      location: e.target.value === 'virtual' ? 'Videollamada' : ''
                    })}
                    className="text-primary"
                  />
                  <Video className="h-4 w-4" />
                  <span className="text-sm">Virtual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="locationType"
                    value="presencial"
                    checked={formData.locationType === 'presencial'}
                    onChange={(e) => setFormData({
                      ...formData, 
                      locationType: e.target.value as 'virtual' | 'presencial',
                      location: ''
                    })}
                    className="text-primary"
                  />
                  <Building className="h-4 w-4" />
                  <span className="text-sm">Presencial</span>
                </label>
              </div>
            </div>

            {/* Ubicación/Sede */}
            <div className="grid gap-2">
              <Label htmlFor="location" className="text-sm font-semibold">
                {formData.locationType === 'virtual' ? 'Plataforma' : 'Sede'} <span className="text-destructive">*</span>
              </Label>
              {formData.locationType === 'virtual' ? (
                <Input 
                  id="location" 
                  value="Videollamada"
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(loc => loc !== 'Videollamada').map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Doctor */}
            <div className="grid gap-2">
              <Label htmlFor="doctor" className="text-sm font-semibold">
                Profesional <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.doctor} onValueChange={(value) => setFormData({...formData, doctor: value})}>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Seleccionar profesional" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor} value={doctor}>
                      {doctor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Notas Adicionales
              </Label>
              <Textarea 
                id="notes" 
                placeholder="Información adicional sobre la cita..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowNewAppointmentModal(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitAppointment}
              className="w-full sm:w-auto"
            >
              Agendar Cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <main className="p-4 sm:p-6 lg:p-8">
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
          <Tabs defaultValue="proximas" className="space-y-6 sm:space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-lg h-auto sm:h-12 bg-muted/50">
              <TabsTrigger value="hoy" className="text-xs sm:text-sm lg:text-base font-medium py-2 sm:py-0">
                <span className="hidden sm:inline">Hoy</span>
                <span className="sm:hidden">Hoy</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{todayAppointments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="proximas" className="text-xs sm:text-sm lg:text-base font-medium py-2 sm:py-0">
                <span className="hidden sm:inline">Próximas</span>
                <span className="sm:hidden">Próx</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{upcomingAppointments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="pasadas" className="text-xs sm:text-sm lg:text-base font-medium py-2 sm:py-0">
                <span className="hidden sm:inline">Pasadas</span>
                <span className="sm:hidden">Ant</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{pastAppointments.length}</span>
              </TabsTrigger>
            </TabsList>

          <TabsContent value="hoy" className="space-y-4">
            {todayAppointments.length > 0 ? (
              todayAppointments.map(renderAppointmentCard)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No hay citas para hoy</h3>
                  <p className="text-muted-foreground">No se han programado citas para el día de hoy</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="proximas" className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map(renderAppointmentCard)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No hay citas próximas</h3>
                  <p className="text-muted-foreground">No se han encontrado citas programadas próximamente</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pasadas" className="space-y-4">
            {pastAppointments.length > 0 ? (
              pastAppointments.map(renderAppointmentCard)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No hay citas pasadas</h3>
                  <p className="text-muted-foreground">No se ha encontrado historial de citas</p>
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

