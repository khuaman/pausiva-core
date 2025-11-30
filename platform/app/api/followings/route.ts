import { NextRequest, NextResponse } from 'next/server';

import type { ApiFollowing, SupabaseFollowingRow } from './types';
import { getServiceSupabaseClient } from '@/utils/supabase/service';
import {
  getAuthenticatedUser,
  hasFullAccess,
  isDoctor,
  isPatient,
} from '../auth-helpers';

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
  conversation_id,
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
  const appointmentData = row.appointment?.[0];
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
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    appointment: appointmentData
      ? {
          id: appointmentData.id,
          type: appointmentData.type,
          status: appointmentData.status,
          scheduledAt: appointmentData.scheduled_at,
          notes: appointmentData.notes,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    let patientId = searchParams.get('patientId');
    const limit = parseLimit(searchParams.get('limit'));

    // Apply role-based filtering
    if (isPatient(authUser)) {
      // Patients can only see their own followings
      patientId = authUser.id;
    } else if (isDoctor(authUser)) {
      // Doctors can only see followings for their patients
      // We need to filter by patients assigned to this doctor
      if (!patientId) {
        // If no specific patient requested, get all patients assigned to this doctor
        const { data: patientDoctorRelations } = await supabase
          .from('patient_doctors')
          .select('patient_id')
          .eq('doctor_id', authUser.id)
          .is('ended_at', null);
        
        if (!patientDoctorRelations || patientDoctorRelations.length === 0) {
          return NextResponse.json({
            data: [],
            meta: {
              entity: 'following',
              count: 0,
              limit,
            },
          });
        }

        const patientIds = patientDoctorRelations.map(rel => rel.patient_id);
        const { data, error } = await supabase
          .from('followings')
          .select(FOLLOWINGS_SELECT)
          .in('patient_id', patientIds)
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
      } else {
        // Verify the patient is assigned to this doctor
        const { data: relationship } = await supabase
          .from('patient_doctors')
          .select('id')
          .eq('patient_id', patientId)
          .eq('doctor_id', authUser.id)
          .is('ended_at', null)
          .maybeSingle();
        
        if (!relationship) {
          return NextResponse.json(
            { error: 'Forbidden. You do not have access to this patient.' },
            { status: 403 }
          );
        }
      }
    }
    // Staff has full access

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

