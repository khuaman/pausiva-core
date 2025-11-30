import { NextRequest, NextResponse } from 'next/server';

import type { ApiFollowing, SupabaseFollowingRow } from './types';
import { getServiceSupabaseClient } from '@/utils/supabase/service';

const FOLLOWINGS_SELECT = `
  id,
  patient_id,
  appointment_id,
  type,
  channel,
  contacted_at,
  message_count,
  transcript_url,
  summary,
  severity_score,
  is_urgent,
  created_at,
  appointment:appointments!followings_appointment_id_fkey (
    id,
    type,
    status,
    scheduled_at,
    notes
  )
`;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseLimit(rawLimit: string | null): number {
  const parsed = rawLimit ? Number(rawLimit) : NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function mapFollowing(row: SupabaseFollowingRow): ApiFollowing {
  return {
    id: row.id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    type: row.type,
    channel: row.channel,
    contactedAt: row.contacted_at,
    messageCount: row.message_count,
    transcriptUrl: row.transcript_url,
    summary: row.summary,
    severityScore: row.severity_score,
    isUrgent: row.is_urgent,
    createdAt: row.created_at,
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
    const limit = parseLimit(searchParams.get('limit'));

    let query = supabase.from('followings').select(FOLLOWINGS_SELECT);
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query
      .order('contacted_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const typedData = (data ?? []) as SupabaseFollowingRow[];
    const mapped = typedData.map(mapFollowing);

    return NextResponse.json({
      data: mapped,
      meta: {
        entity: 'following',
        count: mapped.length,
        limit,
      },
    });
  } catch (error) {
    console.error('[api/followings] Error fetching followings', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching followings from Supabase.' },
      { status: 500 }
    );
  }
}

