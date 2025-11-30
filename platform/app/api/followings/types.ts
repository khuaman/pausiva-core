import type { AppointmentStatus, AppointmentType } from '@/utils/types/appointments';

export type SupabaseFollowingRow = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  type: string;
  channel: string;
  contacted_at: string;
  message_count: number;
  transcript_url: string | null;
  summary: string | null;
  severity_score: number | null;
  is_urgent: boolean;
  conversation_id: string | null;
  created_at: string;
  appointment?: {
    id: string;
    type: AppointmentType;
    status: AppointmentStatus;
    scheduled_at: string | null;
    notes: string | null;
  }[] | null;
};

export type ApiFollowing = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  type: string;
  channel: string;
  contactedAt: string;
  messageCount: number;
  transcriptUrl: string | null;
  summary: string | null;
  severityScore: number | null;
  isUrgent: boolean;
  conversationId: string | null;
  createdAt: string;
  appointment:
    | {
        id: string;
        type: AppointmentType;
        status: AppointmentStatus;
        scheduledAt: string | null;
        notes: string | null;
      }
    | null;
};

