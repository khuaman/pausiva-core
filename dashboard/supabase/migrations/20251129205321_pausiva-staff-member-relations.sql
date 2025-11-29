-- Supabase schema migration: staff, memberships, and relations
-- Based on DATABASE_SCHEMA_SUPABASE.md (non-clinical entities).
-- This script adds staff, membership, audit, and patient-doctor relationship tables.
--
-- NOTE: This migration assumes the "pgcrypto" extension (for gen_random_uuid())
-- is already enabled by your base Supabase project migrations.

begin;

-- 1. Enums --------------------------------------------------------------------

create type staff_role as enum ('admin', 'support', 'billing', 'operations');

create type membership_status as enum (
  'active',
  'paused',
  'cancelled',
  'expired'
);

create type membership_tier as enum ('basic', 'standard', 'premium');


-- 2. Tables -------------------------------------------------------------------

-- 2.1 staff
create table public.staff (
  id uuid primary key,
  dni text,
  employee_id text not null,
  role staff_role not null default 'support',
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_id_fkey foreign key (id) references public.users (id) on delete cascade,
  constraint staff_employee_id_key unique (employee_id),
  constraint staff_dni_key unique (dni)
);

-- 2.2 memberships
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  tier membership_tier not null default 'basic',
  status membership_status not null default 'active',
  start_date timestamptz not null default now(),
  end_date timestamptz,
  renewal_date timestamptz,
  price numeric(10, 2) not null,
  currency char(3) not null default 'PEN',
  auto_renew boolean not null default true,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text,
  metadata jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_patient_id_fkey foreign key (patient_id) references public.patients (id) on delete cascade,
  constraint memberships_cancelled_by_fkey foreign key (cancelled_by) references public.users (id) on delete set null,
  constraint memberships_price_non_negative check (price >= 0),
  constraint memberships_end_date_after_start_date check (end_date is null or end_date > start_date)
);

-- 2.3 membership_payments
create table public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null,
  transaction_id text not null,
  amount numeric(10, 2) not null,
  currency char(3) not null default 'PEN',
  status payment_status not null default 'pending',
  payment_method text,
  paid_at timestamptz,
  processed_by uuid,
  created_at timestamptz not null default now(),
  constraint membership_payments_membership_id_fkey foreign key (membership_id) references public.memberships (id) on delete cascade,
  constraint membership_payments_processed_by_fkey foreign key (processed_by) references public.staff (id) on delete set null,
  constraint membership_payments_transaction_id_key unique (transaction_id),
  constraint membership_payments_amount_positive check (amount > 0)
);

-- 2.4 staff_activity_log
create table public.staff_activity_log (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null,
  action_type text not null,
  target_table text,
  target_id uuid,
  description text not null,
  metadata jsonb default null,
  created_at timestamptz not null default now(),
  constraint staff_activity_log_staff_id_fkey foreign key (staff_id) references public.staff (id) on delete cascade
);

-- 2.5 patient_doctors
create table public.patient_doctors (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  doctor_id uuid not null,
  is_primary boolean not null default false,
  relationship_notes text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_doctors_patient_id_fkey foreign key (patient_id) references public.patients (id) on delete cascade,
  constraint patient_doctors_doctor_id_fkey foreign key (doctor_id) references public.doctors (id) on delete cascade,
  constraint patient_doctors_ended_after_started_check check (ended_at is null or ended_at > started_at)
);


-- 3. Indexes ------------------------------------------------------------------

-- staff
create index staff_role_idx on public.staff (role);
create index staff_department_idx on public.staff (department);

-- memberships
create index memberships_patient_id_idx on public.memberships (patient_id);
create index memberships_status_idx on public.memberships (status);
create index memberships_tier_idx on public.memberships (tier);
create index memberships_renewal_date_idx on public.memberships (renewal_date);
create index memberships_status_renewal_date_idx on public.memberships (status, renewal_date);

-- membership_payments
create index membership_payments_membership_id_idx on public.membership_payments (membership_id);
create index membership_payments_status_idx on public.membership_payments (status);
create index membership_payments_paid_at_idx on public.membership_payments (paid_at);
create index membership_payments_processed_by_idx on public.membership_payments (processed_by);

-- staff_activity_log
create index staff_activity_log_staff_id_idx on public.staff_activity_log (staff_id);
create index staff_activity_log_action_type_idx on public.staff_activity_log (action_type);
create index staff_activity_log_created_at_idx on public.staff_activity_log (created_at);
create index staff_activity_log_target_table_target_id_idx on public.staff_activity_log (target_table, target_id);

-- patient_doctors
create index patient_doctors_patient_id_idx on public.patient_doctors (patient_id);
create index patient_doctors_doctor_id_idx on public.patient_doctors (doctor_id);
create index patient_doctors_patient_id_doctor_id_idx on public.patient_doctors (patient_id, doctor_id);

create unique index patient_doctors_patient_id_doctor_id_active_key
  on public.patient_doctors (patient_id, doctor_id)
  where ended_at is null;

commit;

