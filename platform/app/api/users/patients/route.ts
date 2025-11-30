import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ApiPatient,
  SupabasePatientRow,
  SupabaseUserRow,
} from '../types';
import { getServiceSupabaseClient } from '@/utils/supabase/service';
import {
  provisionUserAccount,
  teardownProvisionedUser,
  type ProvisionedUserProfile,
} from '../utils';

type FetchFilters = {
  id?: string | null;
  limit: number;
};

const PATIENT_SELECT = `
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

type PatientRowWithUser = SupabasePatientRow & { users: SupabaseUserRow };

type PatientStats = {
  consultasCount: number;
  preconsultasCount: number;
  hasPlans: boolean;
  lastAppointmentDate: string | null;
};

function mapPatient(row: PatientRowWithUser, stats?: PatientStats): ApiPatient {
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
    stats,
  };
}

async function fetchPatientStats(
  client: SupabaseClient,
  patientId: string
): Promise<PatientStats> {
  const [consultasResult, preconsultasResult, plansResult, lastAppointmentResult] = await Promise.all([
    client
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('type', 'consulta'),
    client
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('type', 'pre_consulta'),
    client
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId),
    client
      .from('appointments')
      .select('scheduled_at')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    consultasCount: consultasResult.count || 0,
    preconsultasCount: preconsultasResult.count || 0,
    hasPlans: (plansResult.count || 0) > 0,
    lastAppointmentDate: lastAppointmentResult.data?.scheduled_at || null,
  };
}

async function fetchPatients(
  client: SupabaseClient,
  { id, limit }: FetchFilters,
  includeStats: boolean = false
): Promise<ApiPatient[]> {
  let query = client.from('patients').select(PATIENT_SELECT);

  if (id) {
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    if (!data) {
      return [];
    }

    const typedRow = data as unknown as SupabasePatientRow;
    if (!typedRow.users) {
      return [];
    }

    const safeRow: PatientRowWithUser = {
      ...typedRow,
      users: typedRow.users,
    };

    const stats = includeStats ? await fetchPatientStats(client, safeRow.id) : undefined;
    return [mapPatient(safeRow, stats)];
  }

  const { data, error } = await query.limit(limit);
  if (error) {
    throw error;
  }

  const typedData = (data ?? []) as unknown as SupabasePatientRow[];
  const patientsWithUser = typedData.filter((row): row is PatientRowWithUser => Boolean(row.users));

  if (includeStats) {
    const patientsWithStats = await Promise.all(
      patientsWithUser.map(async (row) => {
        const stats = await fetchPatientStats(client, row.id);
        return mapPatient(row, stats);
      })
    );
    return patientsWithStats;
  }

  return patientsWithUser.map((row) => mapPatient(row));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const limit = parseLimit(searchParams.get('limit'));
    const includeStats = searchParams.get('includeStats') === 'true';

    const patients = await fetchPatients(supabase, { id: idParam, limit }, includeStats);
    const sorted = patients.sort(
      (a, b) => new Date(b.profile.createdAt).getTime() - new Date(a.profile.createdAt).getTime()
    );

    if (idParam && sorted.length === 0) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    return NextResponse.json({
      data: sorted,
      meta: {
        entity: 'patient',
        count: sorted.length,
        limit,
      },
    });
  } catch (error) {
    console.error('[api/users/patients] Error fetching patients', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching patients from Supabase.' },
      { status: 500 }
    );
  }
}

type CreatePatientBody = {
  profile?: Partial<ProvisionedUserProfile> & {
    email?: string;
    fullName?: string;
  };
  metadata?: {
    dni?: string;
    clinicalProfile?: Record<string, unknown> | string | null;
  };
  credentials?: {
    password?: string | null;
  };
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function assertPatientPayload(body: unknown): asserts body is Required<CreatePatientBody> {
  if (!body || typeof body !== 'object') {
    throw new Error('Payload must be an object');
  }
  const { profile, metadata } = body as CreatePatientBody;
  if (!profile) {
    throw new Error('Missing profile section');
  }
  if (!metadata) {
    throw new Error('Missing metadata section');
  }
  if (!profile.fullName || !profile.fullName.trim()) {
    throw new Error('Full name is required');
  }
  if (!profile.email || !isValidEmail(profile.email.trim().toLowerCase())) {
    throw new Error('Valid email is required');
  }
  if (!metadata.dni || !metadata.dni.trim()) {
    throw new Error('DNI is required');
  }
}

function normalizeClinicalProfile(
  clinicalProfile: Record<string, unknown> | string | null | undefined
): Record<string, unknown> | null {
  if (!clinicalProfile) {
    return null;
  }

  if (typeof clinicalProfile === 'string') {
    try {
      const parsed = JSON.parse(clinicalProfile);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      throw new Error('clinicalProfile must be valid JSON');
    }
  }

  return clinicalProfile;
}

function normalizeProfile(profile: Required<CreatePatientBody>['profile']): ProvisionedUserProfile {
  const trimmedPhone = profile.phone?.trim();
  const trimmedPicture = profile.pictureUrl?.trim();
  const birthDate = profile.birthDate?.trim();

  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error('birthDate must follow YYYY-MM-DD format');
  }

  return {
    fullName: profile.fullName?.trim() ?? '',
    email: profile.email?.trim().toLowerCase() ?? '',
    phone: trimmedPhone?.length ? trimmedPhone : null,
    birthDate: birthDate ?? null,
    pictureUrl: trimmedPicture?.length ? trimmedPicture : null,
  };
}

export async function POST(request: NextRequest) {
  let parsedBody: Required<CreatePatientBody>;

  try {
    const rawBody = (await request.json()) as CreatePatientBody;
    assertPatientPayload(rawBody);
    parsedBody = rawBody as Required<CreatePatientBody>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const profile = normalizeProfile(parsedBody.profile);
  const patientMetadata = {
    dni: parsedBody.metadata.dni?.trim() ?? '',
    clinicalProfile: normalizeClinicalProfile(parsedBody.metadata.clinicalProfile),
  };

  try {
    const { userId, temporaryPassword } = await provisionUserAccount(
      supabase,
      profile,
      'paciente',
      parsedBody.credentials?.password ?? null
    );

    const { error: patientInsertError } = await supabase.from('patients').insert({
      id: userId,
      dni: patientMetadata.dni,
      clinical_profile_json: patientMetadata.clinicalProfile,
    });

    if (patientInsertError) {
      await teardownProvisionedUser(supabase, userId);
      console.error('[api/users/patients] Failed to insert patient row', patientInsertError);
      return NextResponse.json(
        { error: 'Could not create patient record in Supabase.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: userId,
          email: profile.email,
          temporaryPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/users/patients] Error creating patient', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error creating patient.';
    
    // Check for duplicate email error
    if (errorMessage.includes('User already registered') || 
        errorMessage.includes('already been registered') ||
        errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado en el sistema.' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { error: 'Patient ID is required.' },
        { status: 400 }
      );
    }

    // First, verify the patient exists
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', idParam)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[api/users/patients] Error checking patient existence', fetchError);
      return NextResponse.json(
        { error: 'Error verifying patient existence.' },
        { status: 500 }
      );
    }

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found.' },
        { status: 404 }
      );
    }

    // Check for dependencies before deletion
    const [
      { count: appointmentsCount },
      { count: followingsCount },
      { count: plansCount }
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', idParam),
      supabase
        .from('followings')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', idParam),
      supabase
        .from('plans')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', idParam),
    ]);

    const totalDependencies = (appointmentsCount || 0) + (followingsCount || 0) + (plansCount || 0);

    if (totalDependencies > 0) {
      const dependencies = [];
      if (appointmentsCount) dependencies.push(`${appointmentsCount} cita${appointmentsCount > 1 ? 's' : ''}`);
      if (followingsCount) dependencies.push(`${followingsCount} seguimiento${followingsCount > 1 ? 's' : ''}`);
      if (plansCount) dependencies.push(`${plansCount} plan${plansCount > 1 ? 'es' : ''}`);

      return NextResponse.json(
        {
          error: `No se puede eliminar el paciente porque tiene registros asociados: ${dependencies.join(', ')}.`,
          details: {
            hasAppointments: !!appointmentsCount,
            hasFollowings: !!followingsCount,
            hasPlans: !!plansCount,
            appointmentsCount: appointmentsCount || 0,
            followingsCount: followingsCount || 0,
            plansCount: plansCount || 0,
          },
        },
        { status: 409 }
      );
    }

    // Delete the patient record
    const { error: deletePatientError } = await supabase
      .from('patients')
      .delete()
      .eq('id', idParam);

    if (deletePatientError) {
      console.error('[api/users/patients] Error deleting patient record', deletePatientError);
      
      // Check if it's a foreign key constraint error
      if (deletePatientError.code === '23503') {
        return NextResponse.json(
          {
            error: 'No se puede eliminar el paciente porque tiene registros asociados en el sistema.',
            details: { hasDependencies: true },
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Could not delete patient record.' },
        { status: 500 }
      );
    }

    // Delete the user account (auth)
    await teardownProvisionedUser(supabase, idParam);

    return NextResponse.json(
      { message: 'Patient deleted successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[api/users/patients] Error deleting patient', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error deleting patient.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
