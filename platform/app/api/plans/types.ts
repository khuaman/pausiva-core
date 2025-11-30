import type { AppointmentStatus, AppointmentType } from '@/utils/types/appointments';

export type SupabasePlanRow = {
  id: string;
  appointment_id: string;
  start_date: string | null;
  end_date: string | null;
  plan: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
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

export type ApiPlan = {
  id: string;
  appointmentId: string;
  startDate: string | null;
  endDate: string | null;
  plan: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
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

