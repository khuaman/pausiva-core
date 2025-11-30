import type {
  DoctorMetadata,
  PatientMetadata,
  UserProfile,
} from '@/utils/types/users';

export type ApiDoctor = {
  id: string;
  type: 'doctor';
  profile: UserProfile;
  metadata: DoctorMetadata;
};

export type ApiPatient = {
  id: string;
  type: 'patient';
  profile: UserProfile;
  metadata: PatientMetadata;
};

export type SupabaseUserRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  picture_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseDoctorRow = {
  id: string;
  dni: string | null;
  cmp: string;
  specialty: string;
  users: SupabaseUserRow | null;
};

export type SupabasePatientRow = {
  id: string;
  dni: string;
  clinical_profile_json: Record<string, unknown> | null;
  users: SupabaseUserRow | null;
};

