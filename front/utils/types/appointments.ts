import type { DoctorMetadata, PatientMetadata, UserProfile } from './users';

export const APPOINTMENT_TYPE_VALUES = ['pre_consulta', 'consulta'] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPE_VALUES)[number];

export const APPOINTMENT_STATUS_VALUES = [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS_VALUES)[number];

export type AppointmentParticipant<TMetadata> = {
  id: string;
  profile: UserProfile;
  metadata: TMetadata;
};

export type AppointmentPatient = AppointmentParticipant<PatientMetadata>;
export type AppointmentDoctor = AppointmentParticipant<DoctorMetadata>;

export type Appointment = {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: AppointmentPatient;
  doctor: AppointmentDoctor;
};


