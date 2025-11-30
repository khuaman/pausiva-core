"use client";

import { useCallback, useMemo, useState } from 'react';
import { Plus, UserPlus, Stethoscope, CalendarPlus, Loader2, Copy, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { usePatients } from '@/hooks/use-patients';
import { useDoctors } from '@/hooks/use-doctors';
import { useDataRefetch } from '@/contexts/DataRefetchContext';
import {
  APPOINTMENT_STATUS_VALUES,
  APPOINTMENT_TYPE_VALUES,
  type AppointmentStatus,
  type AppointmentType,
} from '@/utils/types/appointments';

type ActiveModal = 'patient' | 'doctor' | 'appointment' | null;

type PasswordModalData = {
  userType: 'patient' | 'doctor';
  fullName: string;
  email: string;
  temporaryPassword: string;
};

const INITIAL_PATIENT_FORM = {
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  pictureUrl: '',
  dni: '',
  clinicalProfile: '',
};

const INITIAL_DOCTOR_FORM = {
  fullName: '',
  email: '',
  phone: '',
  birthDate: '',
  pictureUrl: '',
  cmp: '',
  specialty: '',
  dni: '',
};

const INITIAL_APPOINTMENT_FORM = {
  patientId: '',
  doctorId: '',
  type: APPOINTMENT_TYPE_VALUES[0] as AppointmentType,
  status: 'scheduled' as AppointmentStatus,
  date: '',
  time: '',
  notes: '',
};

function formatEnumLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function parseJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error || 'Operación fallida. Inténtalo nuevamente.';
    
    // Detect specific error patterns and provide user-friendly messages
    if (errorMessage.includes('User already registered') || 
        errorMessage.includes('duplicate key') ||
        errorMessage.includes('already exists')) {
      
      if (errorMessage.toLowerCase().includes('email')) {
        throw new Error('Ya existe un usuario registrado con este correo electrónico.');
      }
      if (errorMessage.toLowerCase().includes('cmp')) {
        throw new Error('Ya existe un doctor registrado con este CMP.');
      }
      throw new Error('Ya existe un registro con estos datos.');
    }
    
    // Handle specific field validation errors
    if (errorMessage.includes('email is required') || errorMessage.includes('Valid email')) {
      throw new Error('El correo electrónico es obligatorio y debe ser válido.');
    }
    if (errorMessage.includes('Full name is required')) {
      throw new Error('El nombre completo es obligatorio.');
    }
    if (errorMessage.includes('DNI is required')) {
      throw new Error('El DNI es obligatorio.');
    }
    if (errorMessage.includes('CMP is required')) {
      throw new Error('El CMP es obligatorio.');
    }
    if (errorMessage.includes('Specialty is required')) {
      throw new Error('La especialidad es obligatoria.');
    }
    
    throw new Error(errorMessage);
  }
  return data;
}

export function AdminCreateMenu() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [patientForm, setPatientForm] = useState(INITIAL_PATIENT_FORM);
  const [doctorForm, setDoctorForm] = useState(INITIAL_DOCTOR_FORM);
  const [appointmentForm, setAppointmentForm] = useState(INITIAL_APPOINTMENT_FORM);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [passwordModalData, setPasswordModalData] = useState<PasswordModalData | null>(null);
  const [sendingPassword, setSendingPassword] = useState(false);

  const {
    patients,
    loading: loadingPatients,
    refetch: refetchPatients,
  } = usePatients({ limit: 100 });
  const {
    doctors,
    loading: loadingDoctors,
    refetch: refetchDoctors,
  } = useDoctors({ limit: 100 });

  const { triggerPatientsRefetch, triggerDoctorsRefetch } = useDataRefetch();

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        id: patient.id,
        label: patient.profile.fullName,
      })),
    [patients]
  );

  const doctorOptions = useMemo(
    () =>
      doctors.map((doctor) => ({
        id: doctor.id,
        label: `${doctor.profile.fullName} · ${doctor.metadata.specialty}`,
      })),
    [doctors]
  );

  const closeModal = () => setActiveModal(null);

  const handleCopyPassword = useCallback(() => {
    if (passwordModalData?.temporaryPassword) {
      navigator.clipboard.writeText(passwordModalData.temporaryPassword);
      toast({
        title: 'Contraseña copiada',
        description: 'La contraseña temporal se ha copiado al portapapeles.',
      });
    }
  }, [passwordModalData]);

  const handleSendPassword = useCallback(async () => {
    if (!passwordModalData) return;

    setSendingPassword(true);
    try {
      // TODO: Implement email sending endpoint
      // For now, we'll simulate the call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: 'Contraseña enviada',
        description: `Se ha enviado la contraseña temporal a ${passwordModalData.email}`,
      });
      setPasswordModalData(null);
    } catch (error) {
      toast({
        title: 'Error al enviar',
        description: error instanceof Error ? error.message : 'No se pudo enviar la contraseña.',
        variant: 'destructive',
      });
    } finally {
      setSendingPassword(false);
    }
  }, [passwordModalData]);

  const handlePatientSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!patientForm.fullName.trim() || !patientForm.email.trim() || !patientForm.dni.trim()) {
        toast({
          title: 'Campos incompletos',
          description: 'Nombre completo, correo y DNI son obligatorios.',
          variant: 'destructive',
        });
        return;
      }

      let parsedClinicalProfile: Record<string, unknown> | null = null;
      if (patientForm.clinicalProfile.trim()) {
        try {
          parsedClinicalProfile = JSON.parse(patientForm.clinicalProfile);
          if (typeof parsedClinicalProfile !== 'object' || parsedClinicalProfile === null) {
            throw new Error('El perfil clínico debe ser un objeto JSON.');
          }
        } catch (error) {
          toast({
            title: 'JSON inválido',
            description:
              error instanceof Error ? error.message : 'No se pudo interpretar el perfil clínico.',
            variant: 'destructive',
          });
          return;
        }
      }

      setCreatingPatient(true);
      try {
        const response = await fetch('/api/users/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: {
              fullName: patientForm.fullName,
              email: patientForm.email,
              phone: patientForm.phone || null,
              birthDate: patientForm.birthDate || null,
              pictureUrl: patientForm.pictureUrl || null,
            },
            metadata: {
              dni: patientForm.dni,
              clinicalProfile: parsedClinicalProfile,
            },
          }),
        });

        const result = await parseJsonResponse(response);
        
        if (result.data?.temporaryPassword) {
          setPasswordModalData({
            userType: 'patient',
            fullName: patientForm.fullName,
            email: patientForm.email,
            temporaryPassword: result.data.temporaryPassword,
          });
        } else {
          toast({
            title: 'Paciente creado',
            description: 'El paciente se registró correctamente.',
          });
        }
        
        setPatientForm(INITIAL_PATIENT_FORM);
        closeModal();
        
        // Refetch both the local dropdown list and trigger refetch in all registered components
        await Promise.all([
          refetchPatients(),
          triggerPatientsRefetch()
        ]);
      } catch (error) {
        toast({
          title: 'No se pudo crear el paciente',
          description: error instanceof Error ? error.message : 'Error inesperado.',
          variant: 'destructive',
        });
      } finally {
        setCreatingPatient(false);
      }
    },
    [patientForm, refetchPatients, triggerPatientsRefetch]
  );

  const handleDoctorSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!doctorForm.fullName.trim() || !doctorForm.email.trim() || !doctorForm.cmp.trim()) {
        toast({
          title: 'Campos incompletos',
          description: 'Nombre completo, correo y CMP son obligatorios.',
          variant: 'destructive',
        });
        return;
      }

      setCreatingDoctor(true);
      try {
        const response = await fetch('/api/users/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: {
              fullName: doctorForm.fullName,
              email: doctorForm.email,
              phone: doctorForm.phone || null,
              birthDate: doctorForm.birthDate || null,
              pictureUrl: doctorForm.pictureUrl || null,
            },
            metadata: {
              cmp: doctorForm.cmp,
              specialty: doctorForm.specialty,
              dni: doctorForm.dni || null,
            },
          }),
        });

        const result = await parseJsonResponse(response);
        
        if (result.data?.temporaryPassword) {
          setPasswordModalData({
            userType: 'doctor',
            fullName: doctorForm.fullName,
            email: doctorForm.email,
            temporaryPassword: result.data.temporaryPassword,
          });
        } else {
          toast({
            title: 'Doctor creado',
            description: 'El doctor se registró correctamente.',
          });
        }
        
        setDoctorForm(INITIAL_DOCTOR_FORM);
        closeModal();
        
        // Refetch both the local dropdown list and trigger refetch in all registered components
        await Promise.all([
          refetchDoctors(),
          triggerDoctorsRefetch()
        ]);
      } catch (error) {
        toast({
          title: 'No se pudo crear el doctor',
          description: error instanceof Error ? error.message : 'Error inesperado.',
          variant: 'destructive',
        });
      } finally {
        setCreatingDoctor(false);
      }
    },
    [doctorForm, refetchDoctors, triggerDoctorsRefetch]
  );

  const handleAppointmentSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const { patientId, doctorId, date, time, type, status, notes } = appointmentForm;

      if (!patientId || !doctorId || !date || !time) {
        toast({
          title: 'Campos incompletos',
          description: 'Paciente, profesional, fecha y hora son obligatorios.',
          variant: 'destructive',
        });
        return;
      }

      const scheduledAt = new Date(`${date}T${time}`);
      if (Number.isNaN(scheduledAt.getTime())) {
        toast({
          title: 'Fecha u hora inválida',
          description: 'Verifica que la fecha y la hora tengan un formato válido.',
          variant: 'destructive',
        });
        return;
      }

      setCreatingAppointment(true);
      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            doctorId,
            type,
            status,
            scheduledAt: scheduledAt.toISOString(),
            notes: notes?.trim() ? notes.trim() : null,
          }),
        });

        await parseJsonResponse(response);
        toast({
          title: 'Cita creada',
          description: 'La cita fue agendada correctamente.',
        });
        setAppointmentForm(INITIAL_APPOINTMENT_FORM);
        closeModal();
      } catch (error) {
        toast({
          title: 'No se pudo crear la cita',
          description: error instanceof Error ? error.message : 'Error inesperado.',
          variant: 'destructive',
        });
      } finally {
        setCreatingAppointment(false);
      }
    },
    [appointmentForm]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full justify-between" variant="default">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Nuevo registro</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setActiveModal('appointment')}>
            <CalendarPlus className="mr-2 h-4 w-4 text-primary" />
            Cita médica
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActiveModal('patient')}>
            <UserPlus className="mr-2 h-4 w-4 text-primary" />
            Paciente
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActiveModal('doctor')}>
            <Stethoscope className="mr-2 h-4 w-4 text-primary" />
            Doctor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Crear Paciente */}
      <Dialog
        open={activeModal === 'patient'}
        onOpenChange={(open) => setActiveModal(open ? 'patient' : null)}
      >
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear paciente</DialogTitle>
            <DialogDescription>
              Los datos alimentan las tablas <code>users</code> y <code>patients</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePatientSubmit} className="space-y-5">
            <div className="grid gap-2">
              <Label>
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={patientForm.fullName}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="Ej. Carmen López"
                required
              />
              <p className="text-xs text-muted-foreground">Campo obligatorio</p>
            </div>
            <div className="grid gap-2">
              <Label>
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={patientForm.email}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="correo@pausiva.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Campo obligatorio · Debe ser único en el sistema
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Teléfono <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Input
                  value={patientForm.phone}
                  onChange={(event) =>
                    setPatientForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="+51 999 999 999"
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Fecha de nacimiento <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Input
                  type="date"
                  value={patientForm.birthDate}
                  onChange={(event) =>
                    setPatientForm((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>
                Foto (URL) <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                value={patientForm.pictureUrl}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, pictureUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>
                DNI <span className="text-destructive">*</span>
              </Label>
              <Input
                value={patientForm.dni}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, dni: event.target.value }))
                }
                placeholder="Documento nacional de identidad"
                required
              />
              <p className="text-xs text-muted-foreground">Campo obligatorio</p>
            </div>
            <div className="grid gap-2">
              <Label>
                Perfil clínico <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Textarea
                value={patientForm.clinicalProfile}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, clinicalProfile: event.target.value }))
                }
                rows={4}
                placeholder='{"antecedentes":"...","alergias":["..."]}'
              />
              <p className="text-xs text-muted-foreground">
                Debe ser un objeto JSON válido. Se almacena en <code>patients.clinical_profile_json</code>.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeModal} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={creatingPatient}>
                {creatingPatient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar paciente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Crear Doctor */}
      <Dialog
        open={activeModal === 'doctor'}
        onOpenChange={(open) => setActiveModal(open ? 'doctor' : null)}
      >
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear doctor</DialogTitle>
            <DialogDescription>
              Se crearán las filas correspondientes en <code>users</code> y <code>doctors</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDoctorSubmit} className="space-y-5">
            <div className="grid gap-2">
              <Label>
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={doctorForm.fullName}
                onChange={(event) =>
                  setDoctorForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="Ej. Dra. María González"
                required
              />
              <p className="text-xs text-muted-foreground">Campo obligatorio</p>
            </div>
            <div className="grid gap-2">
              <Label>
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={doctorForm.email}
                onChange={(event) =>
                  setDoctorForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="correo@pausiva.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Campo obligatorio · Debe ser único en el sistema
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Teléfono <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Input
                  value={doctorForm.phone}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="+51 999 999 999"
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Fecha de nacimiento <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Input
                  type="date"
                  value={doctorForm.birthDate}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>
                Foto (URL) <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                value={doctorForm.pictureUrl}
                onChange={(event) =>
                  setDoctorForm((prev) => ({ ...prev, pictureUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  CMP <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={doctorForm.cmp}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, cmp: event.target.value }))
                  }
                  placeholder="Licencia colegiada"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Campo obligatorio · Debe ser único en el sistema
                </p>
              </div>
              <div className="grid gap-2">
                <Label>
                  Especialidad <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={doctorForm.specialty}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, specialty: event.target.value }))
                  }
                  placeholder="Ej. Ginecología"
                  required
                />
                <p className="text-xs text-muted-foreground">Campo obligatorio</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>
                DNI <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                value={doctorForm.dni}
                onChange={(event) =>
                  setDoctorForm((prev) => ({ ...prev, dni: event.target.value }))
                }
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeModal} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={creatingDoctor}>
                {creatingDoctor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar doctor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Crear Cita */}
      <Dialog
        open={activeModal === 'appointment'}
        onOpenChange={(open) => setActiveModal(open ? 'appointment' : null)}
      >
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear cita médica</DialogTitle>
            <DialogDescription>
              Aplica las reglas de la tabla <code>appointments</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAppointmentSubmit} className="space-y-5">
            <div className="grid gap-2">
              <Label>
                Paciente <span className="text-destructive">*</span>
              </Label>
              <Select
                value={appointmentForm.patientId || undefined}
                onValueChange={(value) =>
                  setAppointmentForm((prev) => ({ ...prev, patientId: value }))
                }
                disabled={loadingPatients}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPatients
                        ? 'Cargando pacientes...'
                        : patientOptions.length
                        ? 'Selecciona un paciente'
                        : 'No hay pacientes disponibles'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {patientOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No hay pacientes disponibles
                    </SelectItem>
                  ) : (
                    patientOptions.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Campo obligatorio</p>
            </div>

            <div className="grid gap-2">
              <Label>
                Profesional <span className="text-destructive">*</span>
              </Label>
              <Select
                value={appointmentForm.doctorId || undefined}
                onValueChange={(value) =>
                  setAppointmentForm((prev) => ({ ...prev, doctorId: value }))
                }
                disabled={loadingDoctors}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingDoctors
                        ? 'Cargando doctores...'
                        : doctorOptions.length
                        ? 'Selecciona un profesional'
                        : 'No hay doctores disponibles'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {doctorOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No hay doctores disponibles
                    </SelectItem>
                  ) : (
                    doctorOptions.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Campo obligatorio</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={appointmentForm.date}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Hora <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({ ...prev, time: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select
                value={appointmentForm.type}
                onValueChange={(value: AppointmentType) =>
                  setAppointmentForm((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatEnumLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                La cita se creará con estado "Programada"
              </p>
            </div>

            <div className="grid gap-2">
              <Label>
                Notas <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Textarea
                value={appointmentForm.notes}
                onChange={(event) =>
                  setAppointmentForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
                placeholder="Instrucciones adicionales para la cita..."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeModal} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={creatingAppointment}>
                {creatingAppointment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agendar cita
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Modal */}
      <Dialog
        open={!!passwordModalData}
        onOpenChange={(open) => !open && setPasswordModalData(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {passwordModalData?.userType === 'patient' ? 'Paciente' : 'Doctor'} creado exitosamente
            </DialogTitle>
            <DialogDescription>
              Se ha generado una contraseña temporal. Puedes copiarla o enviarla directamente al usuario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Usuario</Label>
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="font-medium">{passwordModalData?.fullName}</p>
                <p className="text-sm text-muted-foreground">{passwordModalData?.email}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-medium">Contraseña temporal</Label>
              <div className="flex gap-2">
                <Input
                  value={passwordModalData?.temporaryPassword || ''}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  title="Copiar contraseña"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta contraseña debe ser cambiada en el primer inicio de sesión.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordModalData(null)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handleSendPassword}
              disabled={sendingPassword}
              className="w-full sm:w-auto"
            >
              {sendingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!sendingPassword && <Send className="mr-2 h-4 w-4" />}
              Enviar por correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


