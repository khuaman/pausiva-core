import type { AppointmentStatus, AppointmentType } from '@/utils/types/appointments';

export type ParaclinicType = 'image' | 'lab' | 'procedure';

export type SupabaseParaclinicRow = {
  id: string;
  appointment_id: string;
  type: ParaclinicType;
  file_format: string | null;
  result_date: string | null;
  file_url: string;
  description: string | null;
  appointment?: {
    id: string;
    type: AppointmentType;
    status: AppointmentStatus;
    scheduled_at: string | null;
    notes: string | null;
    patient_id: string;
    doctor_id: string;
    patient?: {
      id: string;
      dni: string;
      users: {
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
        picture_url: string | null;
      };
    } | null;
    doctor?: {
      id: string;
      cmp: string;
      specialty: string;
      users: {
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
        picture_url: string | null;
      };
    } | null;
  } | null;
};

export type ApiParaclinic = {
  id: string;
  appointmentId: string;
  type: ParaclinicType;
  fileFormat: string | null;
  resultDate: string | null;
  fileUrl: string;
  description: string | null;
  appointment:
    | {
        id: string;
        type: AppointmentType;
        status: AppointmentStatus;
        scheduledAt: string | null;
        notes: string | null;
        patientId: string;
        doctorId: string;
        patient?: {
          id: string;
          dni: string;
          fullName: string;
          email: string;
          phone: string | null;
          pictureUrl: string | null;
        } | null;
        doctor?: {
          id: string;
          cmp: string;
          specialty: string;
          fullName: string;
          email: string;
          phone: string | null;
          pictureUrl: string | null;
        } | null;
      }
    | null;
};

