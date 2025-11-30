import type {
  AppointmentStatus,
  AppointmentType,
} from '@/utils/types/appointments';
import type {
  ApiDoctor,
  ApiPatient,
  SupabaseDoctorRow,
  SupabasePatientRow,
  SupabaseUserRow,
} from '../users/types';

export type AppointmentParticipantSummary = {
  id: string;
  fullName: string;
  pictureUrl: string | null;
};

export type ApiAppointmentSummary = {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  patient: AppointmentParticipantSummary;
  doctor: AppointmentParticipantSummary;
};

export type ApiAppointmentDetail = {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: ApiPatient;
  doctor: ApiDoctor;
};

export type SupabaseAppointmentRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient: (SupabasePatientRow & { users: SupabaseUserRow | null }) | null;
  doctor: (SupabaseDoctorRow & { users: SupabaseUserRow | null }) | null;
};

type ParticipantSummaryRow = {
  id: string;
  users: Pick<SupabaseUserRow, 'id' | 'full_name' | 'picture_url'> | null;
};

export type SupabaseAppointmentSummaryRow = {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  patient: ParticipantSummaryRow | null;
  doctor: ParticipantSummaryRow | null;
};

export type AppointmentFilters = {
  patientId?: string | null;
  doctorId?: string | null;
  status?: AppointmentStatus[] | null;
  from?: string | null;
  to?: string | null;
  limit: number;
};


