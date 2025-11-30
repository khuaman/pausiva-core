import { NextRequest, NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '@/utils/supabase/service';
import type { ApiPlan, SupabasePlanRow } from './types';

const PLAN_SELECT = `
  id,
  appointment_id,
  start_date,
  end_date,
  plan,
  created_at,
  updated_at,
  appointment:appointments!plans_appointment_id_fkey (
    id,
    type,
    status,
    scheduled_at,
    notes
  )
`;

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

function parseLimit(rawLimit: string | null): number {
  const parsed = rawLimit ? Number(rawLimit) : NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function mapPlan(row: SupabasePlanRow): ApiPlan {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    startDate: row.start_date,
    endDate: row.end_date,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    appointment: row.appointment
      ? {
          id: row.appointment.id,
          type: row.appointment.type,
          status: row.appointment.status,
          scheduledAt: row.appointment.scheduled_at,
          notes: row.appointment.notes,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const appointmentId = searchParams.get('appointmentId');
    const limit = parseLimit(searchParams.get('limit'));

    let query = supabase.from('plans').select(PLAN_SELECT);
    if (patientId) {
      query = query.eq('appointment.patient_id', patientId);
    }
    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const typedData = (data ?? []) as SupabasePlanRow[];
    const mapped = typedData.map(mapPlan);

    return NextResponse.json({
      data: mapped,
      meta: {
        entity: 'plan',
        count: mapped.length,
        limit,
      },
    });
  } catch (error) {
    console.error('[api/plans] Error fetching plans', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching plans from Supabase.' },
      { status: 500 }
    );
  }
}

