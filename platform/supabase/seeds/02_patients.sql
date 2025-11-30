-- Seed data for patient-facing tables to simplify local testing.
-- The script is idempotent so it can be re-run without duplicating rows.

with patient_seed as (
  select *
  from (
    values
      (
        '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid,
        'veronica.rivas@example.com',
        'Veronica Rivas',
        '+51987654321',
        '1980-03-12'::date,
        '74859613',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640',
        '2024-11-21 09:30:00+00'::timestamptz,
        '2024-11-27 18:15:00+00'::timestamptz,
        '{"menopause_stage":"perimenopausal","symptom_score":6,"current_medications":["estradiol 50mcg transdermal patch"],"allergies":["penicillin"],"risk_factors":["family_history_breast_cancer"],"preferred_channels":["whatsapp"],"notes":"Prefers telehealth follow-ups every 6 weeks."}'::jsonb
      ),
      (
        '7cbf5ff4-64b2-4a95-8ed5-18495df2da3b'::uuid,
        'lucia.villanueva@example.com',
        'Lucia Villanueva',
        '+51987500441',
        '1975-07-04'::date,
        '42861597',
        'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=640',
        '2024-11-20 15:05:00+00'::timestamptz,
        '2024-11-24 11:22:00+00'::timestamptz,
        '{"menopause_stage":"postmenopausal","symptom_score":3,"current_medications":["calcium citrate 600mg","vitamin d3 2000iu"],"allergies":[],"risk_factors":["osteoporosis"],"preferred_channels":["email","phone"],"notes":"Needs reminders for bone-density labs."}'::jsonb
      ),
      (
        'a72de586-308d-4a32-b545-3a3aaa218414'::uuid,
        'milagros.soto@example.com',
        'Milagros Soto',
        '+51971239904',
        '1986-01-23'::date,
        '51988476',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&auto=format&fit=crop&crop=faces',
        '2024-11-19 10:48:00+00'::timestamptz,
        '2024-11-26 07:50:00+00'::timestamptz,
        '{"menopause_stage":"early_perimenopause","symptom_score":8,"current_medications":["sertraline 50mg"],"allergies":["ibuprofen"],"risk_factors":["migraine"],"preferred_channels":["whatsapp","sms"],"notes":"Tracking anxiety and sleep with wearable integrations."}'::jsonb
      ),
      (
        'c1f9d666-e973-4d4d-8f5f-9ea5a7b3fe5d'::uuid,
        'marta.ayala@example.com',
        'Marta Ayala',
        '+51960002211',
        '1969-10-17'::date,
        '30447781',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&sat=-20',
        '2024-11-18 08:18:00+00'::timestamptz,
        '2024-11-25 14:09:00+00'::timestamptz,
        '{"menopause_stage":"late_postmenopause","symptom_score":2,"current_medications":["atorvastatin 20mg"],"allergies":["shellfish"],"risk_factors":["hypertension","prediabetes"],"preferred_channels":["phone"],"notes":"Primary contact is adult daughter for care coordination."}'::jsonb
      )
  ) as ps(
    id,
    email,
    full_name,
    phone,
    birth_date,
    dni,
    picture_url,
    created_at,
    updated_at,
    clinical_profile_json
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
    ps.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    ps.email,
    '$2a$10$7dN7sY9qsJh0kGugHgd6E.qJzi10BGSAdoo6gWQBaLtgImQxMARUW',
    ps.created_at,
    ps.updated_at,
    jsonb_build_object('provider', 'email'),
    jsonb_build_object('full_name', ps.full_name, 'role', 'patient'),
    ps.created_at,
    ps.updated_at
  from patient_seed ps
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
    ps.id,
    ps.full_name,
    ps.email,
    ps.phone,
    ps.birth_date,
    ps.picture_url,
    ps.created_at,
    ps.updated_at
  from patient_seed ps
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
insert into public.patients (
  id,
  dni,
  clinical_profile_json
)
select
  ps.id,
  ps.dni,
  ps.clinical_profile_json
from patient_seed ps
on conflict (id) do update
set
  dni = excluded.dni,
  clinical_profile_json = excluded.clinical_profile_json;

