"use client";

import { useCallback, useMemo, useState } from 'react';
import { Plus, UserPlus, Stethoscope, CalendarPlus, Loader2 } from 'lucide-react';

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
import {
  APPOINTMENT_STATUS_VALUES,
  APPOINTMENT_TYPE_VALUES,
  type AppointmentStatus,
  type AppointmentType,
} from '@/utils/types/appointments';

type ActiveModal = 'patient' | 'doctor' | 'appointment' | null;

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
  type: APPOINTMENT_TYPE_VALUES[0],
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
    throw new Error((data && data.error) || 'Operación fallida. Inténtalo nuevamente.');
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
        toast({
          title: 'Paciente creado',
          description: result.data?.temporaryPassword
            ? `Contraseña temporal: ${result.data.temporaryPassword}`
            : 'El paciente se registró correctamente.',
        });
        setPatientForm(INITIAL_PATIENT_FORM);
        closeModal();
        await refetchPatients();
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
    [patientForm, refetchPatients]
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
        toast({
          title: 'Doctor creado',
          description: result.data?.temporaryPassword
            ? `Contraseña temporal: ${result.data.temporaryPassword}`
            : 'El doctor se registró correctamente.',
        });
        setDoctorForm(INITIAL_DOCTOR_FORM);
        closeModal();
        await refetchDoctors();
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
    [doctorForm, refetchDoctors]
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
              <Label>Nombre completo *</Label>
              <Input
                value={patientForm.fullName}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="Ej. Carmen López"
              />
            </div>
            <div className="grid gap-2">
              <Label>Correo electrónico *</Label>
              <Input
                type="email"
                value={patientForm.email}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="correo@pausiva.com"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input
                  value={patientForm.phone}
                  onChange={(event) =>
                    setPatientForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="+51 999 999 999"
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de nacimiento</Label>
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
              <Label>Foto (URL)</Label>
              <Input
                value={patientForm.pictureUrl}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, pictureUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>DNI *</Label>
              <Input
                value={patientForm.dni}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, dni: event.target.value }))
                }
                placeholder="Documento nacional de identidad"
              />
            </div>
            <div className="grid gap-2">
              <Label>Perfil clínico (JSON opcional)</Label>
              <Textarea
                value={patientForm.clinicalProfile}
                onChange={(event) =>
                  setPatientForm((prev) => ({ ...prev, clinicalProfile: event.target.value }))
                }
                rows={4}
                placeholder='{"antecedentes":"...","alergias":["..."]}'
              />
              <p className="text-xs text-muted-foreground">
                Estos datos se almacenan en <code>patients.clinical_profile_json</code>.
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
              <Label>Nombre completo *</Label>
              <Input
                value={doctorForm.fullName}
                onChange={(event) =>
                  setDoctorForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="Ej. Dra. María González"
              />
            </div>
            <div className="grid gap-2">
              <Label>Correo electrónico *</Label>
              <Input
                type="email"
                value={doctorForm.email}
                onChange={(event) =>
                  setDoctorForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="correo@pausiva.com"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Teléfono</Label>
                <Input
                  value={doctorForm.phone}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="+51 999 999 999"
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de nacimiento</Label>
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
              <Label>Foto (URL)</Label>
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
                <Label>CMP *</Label>
                <Input
                  value={doctorForm.cmp}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, cmp: event.target.value }))
                  }
                  placeholder="Licencia colegiada"
                />
              </div>
              <div className="grid gap-2">
                <Label>Especialidad *</Label>
                <Input
                  value={doctorForm.specialty}
                  onChange={(event) =>
                    setDoctorForm((prev) => ({ ...prev, specialty: event.target.value }))
                  }
                  placeholder="Ej. Ginecología"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>DNI (opcional)</Label>
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
              <Label>Paciente *</Label>
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
            </div>

            <div className="grid gap-2">
              <Label>Profesional *</Label>
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
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={appointmentForm.date}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(event) =>
                    setAppointmentForm((prev) => ({ ...prev, time: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo *</Label>
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
              </div>
              <div className="grid gap-2">
                <Label>Estado *</Label>
                <Select
                  value={appointmentForm.status}
                  onValueChange={(value: AppointmentStatus) =>
                    setAppointmentForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUS_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notas</Label>
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
    </>
  );
}


