import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ApiDoctor,
  SupabaseDoctorRow,
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

type CreateDoctorBody = {
  profile?: Partial<ProvisionedUserProfile> & {
    email?: string;
    fullName?: string;
  };
  metadata?: {
    dni?: string | null;
    cmp?: string;
    specialty?: string;
  };
  credentials?: {
    password?: string | null;
  };
};

function assertDoctorPayload(body: unknown): asserts body is Required<CreateDoctorBody> {
  if (!body || typeof body !== 'object') {
    throw new Error('Payload must be an object');
  }

  const { profile, metadata } = body as CreateDoctorBody;
  if (!profile) {
    throw new Error('Missing profile section');
  }
  if (!metadata) {
    throw new Error('Missing metadata section');
  }
  if (!profile.fullName || !profile.fullName.trim()) {
    throw new Error('Full name is required');
  }
  if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim().toLowerCase())) {
    throw new Error('Valid email is required');
  }
  if (!metadata.cmp || !metadata.cmp.trim()) {
    throw new Error('CMP is required');
  }
  if (!metadata.specialty || !metadata.specialty.trim()) {
    throw new Error('Specialty is required');
  }
}

function normalizeDoctorProfile(
  profile: Required<CreateDoctorBody>['profile']
): ProvisionedUserProfile {
  const trimmedPhone = profile.phone?.trim();
  const trimmedPicture = profile.pictureUrl?.trim();
  const birthDate = profile.birthDate?.trim();

  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error('birthDate must follow YYYY-MM-DD format');
  }

  return {
    fullName: profile.fullName.trim(),
    email: profile.email.trim().toLowerCase(),
    phone: trimmedPhone?.length ? trimmedPhone : null,
    birthDate: birthDate ?? null,
    pictureUrl: trimmedPicture?.length ? trimmedPicture : null,
  };
}

export async function POST(request: NextRequest) {
  let parsedBody: Required<CreateDoctorBody>;

  try {
    const raw = (await request.json()) as CreateDoctorBody;
    assertDoctorPayload(raw);
    parsedBody = raw as Required<CreateDoctorBody>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const profile = normalizeDoctorProfile(parsedBody.profile);
  const doctorMetadata = {
    cmp: parsedBody.metadata.cmp.trim(),
    specialty: parsedBody.metadata.specialty.trim(),
    dni: parsedBody.metadata.dni?.trim() ?? null,
  };

  try {
    const { userId, temporaryPassword } = await provisionUserAccount(
      supabase,
      profile,
      'doctor',
      parsedBody.credentials?.password ?? null
    );

    const { error: doctorInsertError } = await supabase.from('doctors').insert({
      id: userId,
      cmp: doctorMetadata.cmp,
      specialty: doctorMetadata.specialty,
      dni: doctorMetadata.dni,
    });

    if (doctorInsertError) {
      await teardownProvisionedUser(supabase, userId);
      console.error('[api/users/doctors] Failed to insert doctor row', doctorInsertError);
      
      // Check for unique constraint violation on CMP
      if (doctorInsertError.code === '23505' && 
          doctorInsertError.message?.includes('cmp')) {
        return NextResponse.json(
          { error: 'Ya existe un doctor registrado con este CMP.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Could not create doctor record in Supabase.' },
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
    console.error('[api/users/doctors] Error creating doctor', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error creating doctor.';
    
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

