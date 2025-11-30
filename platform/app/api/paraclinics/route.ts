import { NextRequest, NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '@/utils/supabase/service';
import type { ApiParaclinic, SupabaseParaclinicRow, ParaclinicType } from './types';
import {
  getAuthenticatedUser,
  hasFullAccess,
  isDoctor,
  isPatient,
} from '../auth-helpers';

const PARACLINIC_SELECT = `
  id,
  appointment_id,
  type,
  file_format,
  result_date,
  file_url,
  description,
  appointment:appointments!paraclinics_appointment_id_fkey (
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

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseLimit(rawLimit: string | null): number {
  const parsed = rawLimit ? Number(rawLimit) : NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function mapParaclinic(row: SupabaseParaclinicRow): ApiParaclinic {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    type: row.type,
    fileFormat: row.file_format,
    resultDate: row.result_date,
    fileUrl: row.file_url,
    description: row.description,
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
    const appointmentId = searchParams.get('appointmentId');
    const limit = parseLimit(searchParams.get('limit'));

    // Apply role-based filtering
    if (isPatient(authUser)) {
      // Patients can only see their own paraclinics
      patientId = authUser.id;
    }

    // Build the select with proper joins
    let selectQuery = PARACLINIC_SELECT;
    
    // Use !inner join when filtering by patientId to enable nested filtering
    if (patientId) {
      selectQuery = selectQuery.replace(
        'appointment:appointments!paraclinics_appointment_id_fkey',
        'appointment:appointments!paraclinics_appointment_id_fkey!inner'
      );
    }

    let query = supabase.from('paraclinics').select(selectQuery);
    
    // Filter by patient_id through the appointment relationship
    if (patientId) {
      query = query.eq('appointment.patient_id', patientId);
    }
    
    // If doctor, filter by doctor_id through appointment
    if (isDoctor(authUser) && !patientId) {
      selectQuery = selectQuery.replace(
        'appointment:appointments!paraclinics_appointment_id_fkey',
        'appointment:appointments!paraclinics_appointment_id_fkey!inner'
      );
      query = supabase.from('paraclinics').select(selectQuery);
      query = query.eq('appointment.doctor_id', authUser.id);
    }
    
    // Direct filter on appointment_id
    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    const { data, error } = await query
      .order('result_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const typedData = (data ?? []) as unknown as SupabaseParaclinicRow[];
    const mapped = typedData.map(mapParaclinic);

    return NextResponse.json({
      data: mapped,
      meta: {
        entity: 'paraclinic',
        count: mapped.length,
        limit,
        filters: {
          patientId: patientId || undefined,
          appointmentId: appointmentId || undefined,
        },
      },
    });
  } catch (error) {
    console.error('[api/paraclinics] Error fetching paraclinics', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching paraclinics from Supabase.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Only doctors and staff can create paraclinics
    if (!isDoctor(authUser) && !hasFullAccess(authUser)) {
      return NextResponse.json(
        { error: 'Forbidden. Only doctors and staff can create paraclinics.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { appointmentId, type, fileFormat, resultDate, fileUrl, description } = body;

    // Validate required fields
    if (!appointmentId || !type || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: appointmentId, type, fileUrl' },
        { status: 400 }
      );
    }

    // Validate type enum
    const validTypes: ParaclinicType[] = ['image', 'lab', 'procedure'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: image, lab, procedure' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // If doctor, verify they are assigned to this appointment
    if (isDoctor(authUser)) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, doctor_id')
        .eq('id', appointmentId)
        .single();

      if (appointmentError || !appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      if (appointment.doctor_id !== authUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You can only add paraclinics to your own appointments.' },
          { status: 403 }
        );
      }
    }

    // Insert paraclinic
    const { data, error } = await supabase
      .from('paraclinics')
      .insert({
        appointment_id: appointmentId,
        type,
        file_format: fileFormat || null,
        result_date: resultDate || null,
        file_url: fileUrl,
        description: description || null,
      })
      .select(PARACLINIC_SELECT)
      .single();

    if (error) {
      throw error;
    }

    const typedData = data as unknown as SupabaseParaclinicRow;
    const mapped = mapParaclinic(typedData);

    return NextResponse.json({
      data: mapped,
      meta: {
        entity: 'paraclinic',
        action: 'created',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[api/paraclinics] Error creating paraclinic', error);
    return NextResponse.json(
      { error: 'Unexpected error creating paraclinic.' },
      { status: 500 }
    );
  }
}

