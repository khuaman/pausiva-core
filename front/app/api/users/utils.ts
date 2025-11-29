import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ProvisionedUserProfile = {
  fullName: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  pictureUrl?: string | null;
};

export function generateTemporaryPassword(): string {
  return `Pausiva-${randomBytes(4).toString('hex')}`;
}

export async function provisionUserAccount(
  supabase: SupabaseClient,
  profile: ProvisionedUserProfile,
  role: 'paciente' | 'doctor',
  explicitPassword?: string | null
) {
  const fallbackPassword = explicitPassword && explicitPassword.trim().length >= 8
    ? explicitPassword.trim()
    : generateTemporaryPassword();

  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: fallbackPassword,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: profile.fullName,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Unable to create Supabase auth user');
  }

  const userId = data.user.id;

  try {
    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      full_name: profile.fullName,
      email: profile.email,
      phone: profile.phone ?? null,
      birth_date: profile.birthDate ?? null,
      picture_url: profile.pictureUrl ?? null,
    });

    if (insertError) {
      throw insertError;
    }

    return {
      userId,
      temporaryPassword: fallbackPassword,
    };
  } catch (insertError) {
    await supabase.auth.admin.deleteUser(userId);
    throw insertError;
  }
}

export async function teardownProvisionedUser(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    await supabase.from('users').delete().eq('id', userId);
  } catch (error) {
    console.error('[users/utils] Failed to delete user profile row', error);
  }

  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error('[users/utils] Failed to delete auth user', error);
  }
}


