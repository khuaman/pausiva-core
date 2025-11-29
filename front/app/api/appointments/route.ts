import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getServiceSupabaseClient } from '@/utils/supabase/service';
import {
  APPOINTMENT_STATUS_VALUES,
  APPOINTMENT_TYPE_VALUES,
  type AppointmentStatus,
  type AppointmentType,
} from '@/utils/types/appointments';
import type {
  ApiAppointmentSummary,
  AppointmentFilters,
  SupabaseAppointmentSummaryRow,
  AppointmentParticipantSummary,
} from './types';

type ParticipantSummaryWithUser = {
  id: string;
  users: {
    id: string;
    full_name: string;
    picture_url: string | null;
  };
};

type AppointmentSummaryRowWithRelations = SupabaseAppointmentSummaryRow & {
  doctor: ParticipantSummaryWithUser;
  patient: ParticipantSummaryWithUser;
};

const APPOINTMENT_SUMMARY_SELECT = `
  id,
  type,
  status,
  scheduled_at,
  patient:patients!appointments_patient_id_fkey (
    id,
    users:users (
      id,
      full_name,
      picture_url
    )
  ),
  doctor:doctors!appointments_doctor_id_fkey (
    id,
    users:users (
      id,
      full_name,
      picture_url
    )
  )
`;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(rawLimit: string | null): number {
  const parsed = rawLimit ? Number(rawLimit) : NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function parseStatuses(raw: string | null): AppointmentStatus[] | null {
  if (!raw) {
    return null;
  }

  const statuses = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const validStatuses = statuses.filter((status): status is AppointmentStatus =>
    APPOINTMENT_STATUS_VALUES.includes(status as AppointmentStatus)
  );

  return validStatuses.length > 0 ? validStatuses : null;
}

function parseDateParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeSummaryRow(
  row: SupabaseAppointmentSummaryRow
): AppointmentSummaryRowWithRelations | null {
  // Supabase returns nested relations as arrays or objects depending on the relationship
  const patientUsers = Array.isArray(row.patient?.users)
    ? row.patient.users[0]
    : row.patient?.users;
  const doctorUsers = Array.isArray(row.doctor?.users)
    ? row.doctor.users[0]
    : row.doctor?.users;

  if (!row.patient || !patientUsers || !row.doctor || !doctorUsers) {
    return null;
  }

  return {
    ...row,
    patient: {
      ...row.patient,
      users: patientUsers,
    },
    doctor: {
      ...row.doctor,
      users: doctorUsers,
    },
  };
}

function mapParticipantSummary(
  participant: ParticipantSummaryWithUser
): AppointmentParticipantSummary {
  return {
    id: participant.id,
    fullName: participant.users.full_name,
    pictureUrl: participant.users.picture_url,
  };
}

function mapAppointment(
  row: AppointmentSummaryRowWithRelations
): ApiAppointmentSummary {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    scheduledAt: row.scheduled_at,
    patient: mapParticipantSummary(row.patient),
    doctor: mapParticipantSummary(row.doctor),
  };
}

async function fetchAppointments(
  client: SupabaseClient,
  filters: AppointmentFilters
): Promise<ApiAppointmentSummary[]> {
  const { patientId, doctorId, status, from, to, limit } = filters;
  let query = client.from('appointments').select(APPOINTMENT_SUMMARY_SELECT);

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }

  if (status?.length) {
    query = query.in('status', status);
  }

  if (from) {
    query = query.gte('scheduled_at', from);
  }

  if (to) {
    query = query.lte('scheduled_at', to);
  }

  const { data, error } = await query
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const typedData = (data ?? []) as unknown as SupabaseAppointmentSummaryRow[];
  return typedData
    .map(normalizeSummaryRow)
    .filter(
      (row): row is AppointmentSummaryRowWithRelations => Boolean(row)
    )
    .map(mapAppointment);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);

    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const status = parseStatuses(searchParams.get('status'));
    const from = parseDateParam(searchParams.get('from'));
    const to = parseDateParam(searchParams.get('to'));
    const limit = parseLimit(searchParams.get('limit'));

    const filters: AppointmentFilters = {
      patientId,
      doctorId,
      status,
      from,
      to,
      limit,
    };

    const appointments = await fetchAppointments(supabase, filters);

    return NextResponse.json({
      data: appointments,
      meta: {
        entity: 'appointment',
        count: appointments.length,
        limit,
        filters: {
          patientId,
          doctorId,
          status,
          from,
          to,
        },
      },
    });
  } catch (error) {
    console.error('[api/appointments] Error fetching appointments', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching appointments from Supabase.' },
      { status: 500 }
    );
  }
}

type CreateAppointmentBody = {
  patientId?: string;
  doctorId?: string;
  type?: AppointmentType | string;
  status?: AppointmentStatus | string;
  scheduledAt?: string;
  notes?: string | null;
};

function isAppointmentType(value: string): value is AppointmentType {
  return APPOINTMENT_TYPE_VALUES.includes(value as AppointmentType);
}

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return APPOINTMENT_STATUS_VALUES.includes(value as AppointmentStatus);
}

export async function POST(request: NextRequest) {
  let payload: CreateAppointmentBody;
  try {
    payload = (await request.json()) as CreateAppointmentBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const patientId = payload.patientId?.trim();
  const doctorId = payload.doctorId?.trim();
  const typeRaw = payload.type ?? '';
  const statusRaw = payload.status ?? 'scheduled';
  const notesValue = payload.notes ?? null;
  const scheduledAtRaw = payload.scheduledAt;

  if (!patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
  }
  if (!doctorId) {
    return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
  }
  if (!typeRaw || typeof typeRaw !== 'string' || !isAppointmentType(typeRaw)) {
    return NextResponse.json({ error: 'type must be a valid appointment_type' }, { status: 400 });
  }
  if (!statusRaw || typeof statusRaw !== 'string' || !isAppointmentStatus(statusRaw)) {
    return NextResponse.json({ error: 'status must be a valid appointment_status' }, { status: 400 });
  }
  if (!scheduledAtRaw || typeof scheduledAtRaw !== 'string') {
    return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
  }

  const scheduledDate = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'scheduledAt must be a valid ISO date' }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      type: typeRaw as AppointmentType,
      status: statusRaw as AppointmentStatus,
      scheduled_at: scheduledDate.toISOString(),
      notes: typeof notesValue === 'string' && notesValue.trim().length ? notesValue.trim() : null,
    })
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('[api/appointments] Error creating appointment', error);
    return NextResponse.json(
      { error: 'Unexpected error creating appointment in Supabase.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
      },
    },
    { status: 201 }
  );
}


