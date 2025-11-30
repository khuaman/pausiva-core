-- Seed data for doctor-facing tables to simplify local testing.
-- Idempotent: safely rerun to refresh local state without duplicates.

with doctor_seed as (
  select *
  from (
    values
      (
        '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid,
        'gabriela.montes@example.com',
        'Dra. Gabriela Montes',
        '+51911122334',
        '1978-05-09'::date,
        '42119981',
        'CMP12345',
        'Ginecología integrativa',
        'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=640&h=640&fit=crop',
        '2024-11-21 08:00:00+00'::timestamptz,
        '2024-11-27 16:40:00+00'::timestamptz
      ),
      (
        '1ea680d2-1b91-4dd5-9b3e-61795073aa27'::uuid,
        'sofia.paredes@example.com',
        'Dra. Sofía Paredes',
        '+51922299887',
        '1983-01-18'::date,
        '47226631',
        'CMP67891',
        'Endocrinología reproductiva',
        'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=640&h=640&fit=crop',
        '2024-11-20 10:15:00+00'::timestamptz,
        '2024-11-25 12:10:00+00'::timestamptz
      ),
      (
        '3c8d1f8c-5eac-4c0c-9a42-0e01ef3d8891'::uuid,
        'teresa.maldonado@example.com',
        'Dra. Teresa Maldonado',
        '+51937754002',
        '1974-09-02'::date,
        '29661479',
        'CMP88421',
        'Salud mental femenina',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&h=640&fit=crop',
        '2024-11-19 09:42:00+00'::timestamptz,
        '2024-11-24 19:05:00+00'::timestamptz
      )
  ) as ds(
    id,
    email,
    full_name,
    phone,
    birth_date,
    dni,
    cmp,
    specialty,
    picture_url,
    created_at,
    updated_at
  )
),
auth_upsert as (
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    ds.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    ds.email,
    '$2a$10$7dN7sY9qsJh0kGugHgd6E.qJzi10BGSAdoo6gWQBaLtgImQxMARUW',
    ds.created_at,
    ds.updated_at,
    jsonb_build_object('provider', 'email'),
    jsonb_build_object('full_name', ds.full_name, 'role', 'doctor', 'specialty', ds.specialty),
    ds.created_at,
    ds.updated_at
  from doctor_seed ds
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    last_sign_in_at = excluded.last_sign_in_at,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at
  returning id
),
user_upsert as (
  insert into public.users (
    id,
    full_name,
    email,
    phone,
    birth_date,
    picture_url,
    created_at,
    updated_at
  )
  select
    ds.id,
    ds.full_name,
    ds.email,
    ds.phone,
    ds.birth_date,
    ds.picture_url,
    ds.created_at,
    ds.updated_at
  from doctor_seed ds
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    birth_date = excluded.birth_date,
    picture_url = excluded.picture_url,
    updated_at = excluded.updated_at
  returning id
)
insert into public.doctors (
  id,
  dni,
  cmp,
  specialty
)
select
  ds.id,
  ds.dni,
  ds.cmp,
  ds.specialty
from doctor_seed ds
on conflict (id) do update
set
  dni = excluded.dni,
  cmp = excluded.cmp,
  specialty = excluded.specialty;

