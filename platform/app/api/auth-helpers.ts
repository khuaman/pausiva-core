import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'staff' | 'doctor' | 'paciente';
export type StaffRole = 'admin' | 'support' | 'billing' | 'operations';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  staffRole?: StaffRole;
}

/**
 * Creates a Supabase client from request headers (respects auth)
 */
export function createSupabaseClientFromRequest(request: NextRequest): SupabaseClient {
  const cookies = request.cookies;
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookies.getAll();
        },
        setAll(cookiesToSet) {
          // No-op in API routes - cookies are read-only here
        },
      },
    }
  );
}

/**
 * Helper to determine user role by checking staff, doctors, and patients tables
 */
async function resolveUserRole(
  userId: string,
  supabase: SupabaseClient
): Promise<{ role: UserRole; staffRole?: StaffRole }> {
  // Check if user is staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (staffData) {
    return {
      role: 'staff',
      staffRole: staffData.role as StaffRole,
    };
  }

  // Check if user is a doctor
  const { data: doctorData } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (doctorData) {
    return { role: 'doctor' };
  }

  // Check if user is a patient
  const { data: patientData } = await supabase
    .from('patients')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (patientData) {
    return { role: 'paciente' };
  }

  // Default fallback
  return { role: 'paciente' };
}

/**
 * Gets the authenticated user from the request with their role information
 * Returns null if user is not authenticated
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const supabase = createSupabaseClientFromRequest(request);
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  const { role, staffRole } = await resolveUserRole(user.id, supabase);
  
  return {
    id: user.id,
    email: user.email || '',
    role,
    staffRole,
  };
}

/**
 * Checks if the authenticated user has permission to access all data (staff only)
 */
export function hasFullAccess(user: AuthenticatedUser): boolean {
  return user.role === 'staff';
}

/**
 * Checks if the authenticated user is a doctor
 */
export function isDoctor(user: AuthenticatedUser): boolean {
  return user.role === 'doctor';
}

/**
 * Checks if the authenticated user is a patient
 */
export function isPatient(user: AuthenticatedUser): boolean {
  return user.role === 'paciente';
}

