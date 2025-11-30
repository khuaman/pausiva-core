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
    notes,
    patient_id,
    doctor_id,
    patient:patients!appointments_patient_id_fkey (
      id,
      dni,
      users!patients_id_fkey (
        id,
        full_name,
        email,
        phone,
        picture_url
      )
    ),
    doctor:doctors!appointments_doctor_id_fkey (
      id,
      cmp,
      specialty,
      users!doctors_id_fkey (
        id,
        full_name,
        email,
        phone,
        picture_url
      )
    )
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
          patientId: row.appointment.patient_id,
          doctorId: row.appointment.doctor_id,
          patient: row.appointment.patient
            ? {
                id: row.appointment.patient.id,
                dni: row.appointment.patient.dni,
                fullName: row.appointment.patient.users.full_name,
                email: row.appointment.patient.users.email,
                phone: row.appointment.patient.users.phone,
                pictureUrl: row.appointment.patient.users.picture_url,
              }
            : null,
          doctor: row.appointment.doctor
            ? {
                id: row.appointment.doctor.id,
                cmp: row.appointment.doctor.cmp,
                specialty: row.appointment.doctor.specialty,
                fullName: row.appointment.doctor.users.full_name,
                email: row.appointment.doctor.users.email,
                phone: row.appointment.doctor.users.phone,
                pictureUrl: row.appointment.doctor.users.picture_url,
              }
            : null,
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

    // Build the select with proper joins
    let selectQuery = PLAN_SELECT;
    
    // Use !inner join when filtering by patientId to enable nested filtering
    if (patientId) {
      selectQuery = selectQuery.replace(
        'appointment:appointments!plans_appointment_id_fkey',
        'appointment:appointments!plans_appointment_id_fkey!inner'
      );
    }

    let query = supabase.from('plans').select(selectQuery);
    
    // Filter by patient_id through the appointment relationship
    if (patientId) {
      query = query.eq('appointment.patient_id', patientId);
    }
    
    // Direct filter on appointment_id
    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const typedData = (data ?? []) as unknown as SupabasePlanRow[];
    const mapped = typedData.map(mapPlan);

    return NextResponse.json({
      data: mapped,
      meta: {
        entity: 'plan',
        count: mapped.length,
        limit,
        filters: {
          patientId: patientId || undefined,
          appointmentId: appointmentId || undefined,
        },
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

