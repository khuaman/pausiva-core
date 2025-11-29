-- Supabase schema migration generated from DATABASE_SCHEMA_SUPABASE.md
-- This script creates the enums, tables, and indexes required by the menopause companion dashboard.

begin;

-- NOTE: This migration assumes the "pgcrypto" extension (for gen_random_uuid()) 
-- is managed by your base Supabase project migrations or enabled in the database.


create type appointment_type as enum ('pre_consulta', 'consulta');

create type appointment_status as enum (
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
);

create type paraclinic_type as enum ('image', 'lab', 'procedure');

create type followings_type as enum ('emotional', 'symptoms', 'medications', 'business', 'other');

create type followings_channel as enum ('whatsapp');

create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

create type timeline_event_type as enum ('appointment', 'paraclinic', 'plan', 'followup', 'payment');

-- 2. Tables ------------------------------------------------------------------

create table public.users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  birth_date date,
  picture_url text,
  constraint users_email_key unique (email),
  constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

create table public.patients (
  id uuid primary key,
  dni text not null,
  clinical_profile_json jsonb default null,
  constraint patients_id_fkey foreign key (id) references public.users (id) on delete cascade,
  constraint patients_dni_key unique (dni)
);

create table public.doctors (
  id uuid primary key,
  dni text,
  cmp text not null,
  specialty text not null,
  constraint doctors_id_fkey foreign key (id) references public.users (id) on delete cascade,
  constraint doctors_cmp_key unique (cmp),
  constraint doctors_dni_key unique (dni)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  doctor_id uuid not null,
  type appointment_type not null,
  status appointment_status not null default 'scheduled',
  scheduled_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_patient_id_fkey foreign key (patient_id) references public.patients (id) on delete cascade,
  constraint appointments_doctor_id_fkey foreign key (doctor_id) references public.doctors (id) on delete restrict
);

create table public.paraclinics (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  type paraclinic_type not null,
  file_format text,
  result_date date,
  file_url text not null,
  description text,
  constraint paraclinics_appointment_id_fkey foreign key (appointment_id) references public.appointments (id) on delete cascade
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  start_date date,
  end_date date,
  plan jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_appointment_id_fkey foreign key (appointment_id) references public.appointments (id) on delete cascade
);

create table public.followings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  appointment_id uuid,
  type followings_type not null,
  channel followings_channel not null default 'whatsapp',
  contacted_at timestamptz not null,
  message_count integer not null default 0,
  transcript_url text,
  summary text,
  severity_score integer,
  is_urgent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint followings_patient_id_fkey foreign key (patient_id) references public.patients (id) on delete cascade,
  constraint followings_appointment_id_fkey foreign key (appointment_id) references public.appointments (id) on delete set null,
  constraint followings_severity_score_check check (
    severity_score is null
    or (severity_score >= 0 and severity_score <= 10)
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  transaction_id text not null,
  amount numeric(10, 2) not null,
  currency char(3) not null default 'PEN',
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payments_appointment_id_key unique (appointment_id),
  constraint payments_transaction_id_key unique (transaction_id),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_appointment_id_fkey foreign key (appointment_id) references public.appointments (id) on delete restrict
);

create table public.patient_timeline_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  occurred_at timestamptz not null,
  event_type timeline_event_type not null,
  source_table text not null,
  source_id uuid not null,
  summary text,
  payload jsonb default null,
  constraint patient_timeline_events_patient_id_fkey foreign key (patient_id) references public.patients (id) on delete cascade
);

-- 3. Indexes ----------------------------------------------------------------

create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_doctor_id_idx on public.appointments (doctor_id);
create index appointments_scheduled_at_idx on public.appointments (scheduled_at);

create index paraclinics_appointment_id_idx on public.paraclinics (appointment_id);

create index plans_appointment_id_idx on public.plans (appointment_id);

create index followings_patient_id_idx on public.followings (patient_id);
create index followings_appointment_id_idx on public.followings (appointment_id);
create index followings_is_urgent_idx on public.followings (is_urgent);
create index followings_patient_contacted_at_idx on public.followings (patient_id, contacted_at);

create index payments_status_idx on public.payments (status);
create index payments_status_created_at_idx on public.payments (status, created_at);

create index patient_timeline_events_patient_id_occurred_at_idx
  on public.patient_timeline_events (patient_id, occurred_at);
create index patient_timeline_events_event_type_idx
  on public.patient_timeline_events (event_type);

commit;

