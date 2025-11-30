import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getServiceSupabaseClient } from '@/utils/supabase/service';
import type {
  ApiAppointmentDetail,
  SupabaseAppointmentRow,
} from '../types';
import type {
  ApiDoctor,
  ApiPatient,
  SupabaseDoctorRow,
  SupabasePatientRow,
  SupabaseUserRow,
} from '../../users/types';

type DoctorRowWithUser = SupabaseDoctorRow & { users: SupabaseUserRow };
type PatientRowWithUser = SupabasePatientRow & { users: SupabaseUserRow };
type AppointmentRowWithRelations = SupabaseAppointmentRow & {
  doctor: DoctorRowWithUser;
  patient: PatientRowWithUser;
};

const APPOINTMENT_DETAIL_SELECT = `
  id,
  patient_id,
  doctor_id,
  type,
  status,
  scheduled_at,
  notes,
  created_at,
  updated_at,
  patient:patients!appointments_patient_id_fkey (
    id,
    dni,
    clinical_profile_json,
    users:users (
      id,
      full_name,
      email,
      phone,
      birth_date,
      picture_url,
      created_at,
      updated_at
    )
  ),
  doctor:doctors!appointments_doctor_id_fkey (
    id,
    dni,
    cmp,
    specialty,
    users:users (
      id,
      full_name,
      email,
      phone,
      birth_date,
      picture_url,
      created_at,
      updated_at
    )
  )
`;

function mapDoctor(row: DoctorRowWithUser): ApiDoctor {
  const { users, dni, cmp, specialty } = row;

  return {
    id: users.id,
    type: 'doctor',
    profile: {
      fullName: users.full_name,
      email: users.email,
      phone: users.phone,
      birthDate: users.birth_date,
      pictureUrl: users.picture_url,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    },
    metadata: {
      dni,
      cmp,
      specialty,
    },
  };
}

function mapPatient(row: PatientRowWithUser): ApiPatient {
  const { users, dni, clinical_profile_json } = row;

  return {
    id: users.id,
    type: 'patient',
    profile: {
      fullName: users.full_name,
      email: users.email,
      phone: users.phone,
      birthDate: users.birth_date,
      pictureUrl: users.picture_url,
      createdAt: users.created_at,
      updatedAt: users.updated_at,
    },
    metadata: {
      dni,
      clinicalProfile: clinical_profile_json,
    },
  };
}

function normalizeAppointmentRow(
  row: SupabaseAppointmentRow
): AppointmentRowWithRelations | null {
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

function mapAppointment(row: AppointmentRowWithRelations): ApiAppointmentDetail {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    scheduledAt: row.scheduled_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient: mapPatient(row.patient),
    doctor: mapDoctor(row.doctor),
  };
}

async function fetchAppointmentById(
  client: SupabaseClient,
  id: string
): Promise<ApiAppointmentDetail | null> {
  const { data, error } = await client
    .from('appointments')
    .select(APPOINTMENT_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    return null;
  }

  const normalized = normalizeAppointmentRow(
    data as unknown as SupabaseAppointmentRow
  );

  return normalized ? mapAppointment(normalized) : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const appointment = await fetchAppointmentById(supabase, id);

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    }

    return NextResponse.json({ data: appointment });
  } catch (error) {
    console.error('[api/appointments/[id]] Error fetching appointment detail', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching appointment detail from Supabase.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    // Validate that the appointment exists
    const existingAppointment = await fetchAppointmentById(supabase, id);
    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status value.' },
          { status: 400 }
        );
      }
    }

    // Update the appointment
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[api/appointments/[id]] Error updating appointment', error);
      throw error;
    }

    // Fetch the updated appointment with full details
    const updatedAppointment = await fetchAppointmentById(supabase, id);

    return NextResponse.json({ 
      data: updatedAppointment,
      message: 'Appointment status updated successfully.' 
    });
  } catch (error) {
    console.error('[api/appointments/[id]] Error updating appointment', error);
    return NextResponse.json(
      { error: 'Unexpected error updating appointment.' },
      { status: 500 }
    );
  }
}


