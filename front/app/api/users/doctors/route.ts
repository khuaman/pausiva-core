import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ApiDoctor,
  SupabaseDoctorRow,
  SupabaseUserRow,
} from '../types';
import { getServiceSupabaseClient } from '@/utils/supabase/service';

type FetchFilters = {
  id?: string | null;
  limit: number;
};

const DOCTOR_SELECT = `
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

type DoctorRowWithUser = SupabaseDoctorRow & { users: SupabaseUserRow };

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

async function fetchDoctors(
  client: SupabaseClient,
  { id, limit }: FetchFilters
): Promise<ApiDoctor[]> {
  let query = client.from('doctors').select(DOCTOR_SELECT);

  if (id) {
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    if (!data) {
      return [];
    }

    const typedRow = data as unknown as SupabaseDoctorRow;
    if (!typedRow.users) {
      return [];
    }

    const safeRow: DoctorRowWithUser = {
      ...typedRow,
      users: typedRow.users,
    };

    return [mapDoctor(safeRow)];
  }

  const { data, error } = await query.limit(limit);
  if (error) {
    throw error;
  }

  const typedData = (data ?? []) as unknown as SupabaseDoctorRow[];
  return typedData
    .filter((row): row is DoctorRowWithUser => Boolean(row.users))
    .map(mapDoctor);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const limit = parseLimit(searchParams.get('limit'));

    const doctors = await fetchDoctors(supabase, { id: idParam, limit });
    const sorted = doctors.sort(
      (a, b) => new Date(b.profile.createdAt).getTime() - new Date(a.profile.createdAt).getTime()
    );

    if (idParam && sorted.length === 0) {
      return NextResponse.json({ error: 'Doctor not found.' }, { status: 404 });
    }

    return NextResponse.json({
      data: sorted,
      meta: {
        entity: 'doctor',
        count: sorted.length,
        limit,
      },
    });
  } catch (error) {
    console.error('[api/users/doctors] Error fetching doctors', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching doctors from Supabase.' },
      { status: 500 }
    );
  }
}

