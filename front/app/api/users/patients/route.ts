import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ApiPatient,
  SupabasePatientRow,
  SupabaseUserRow,
} from '../types';
import { getServiceSupabaseClient } from '@/utils/supabase/service';

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

async function fetchPatients(
  client: SupabaseClient,
  { id, limit }: FetchFilters
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

    return [mapPatient(safeRow)];
  }

  const { data, error } = await query.limit(limit);
  if (error) {
    throw error;
  }

  const typedData = (data ?? []) as unknown as SupabasePatientRow[];
  return typedData
    .filter((row): row is PatientRowWithUser => Boolean(row.users))
    .map(mapPatient);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const limit = parseLimit(searchParams.get('limit'));

    const patients = await fetchPatients(supabase, { id: idParam, limit });
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

