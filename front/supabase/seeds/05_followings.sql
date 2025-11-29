-- Datos de seguimiento automatizado provenientes del bot de WhatsApp.
-- Refuerzan el pipeline completo paciente-doctora-chatbot.

insert into public.followings (
  id,
  patient_id,
  appointment_id,
  type,
  channel,
  contacted_at,
  message_count,
  transcript_url,
  summary,
  severity_score,
  is_urgent,
  created_at
)
values
  (
    'a1e5d7c2-3f4b-4c6d-8a9e-5f1c2d3e4b5a'::uuid,
    '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid, -- Veronica Rivas
    'a2d6c7f8-9b1e-4d2f-8a4b-6c5e7f8a9b1c'::uuid,
    'symptoms',
    'whatsapp',
    '2024-11-28 08:15:00+00'::timestamptz,
    18,
    'https://files.pausiva.test/whatsapp/veronica-rivas-chequeo-bochornos.html',
    'El bot detectó repunte moderado de bochornos nocturnos y sugirió respiraciones guiadas mientras confirma cita del 8 de enero.',
    6,
    false,
    '2024-11-28 08:15:00+00'::timestamptz
  ),
  (
    'b2f6e8d3-4a5c-4d7e-9b1f-6c2d3e4f5a6b'::uuid,
    '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid, -- Veronica Rivas
    'f1c5b6e7-8a9d-4c1e-9f3a-5b4d6e7f8a9b'::uuid,
    'medications',
    'whatsapp',
    '2024-11-27 20:40:00+00'::timestamptz,
    12,
    'https://files.pausiva.test/whatsapp/veronica-rivas-recordatorio-trh.pdf',
    'Chatbot confirmó adherencia al parche de estradiol y capturó ausencia de efectos adversos; paciente envió foto del calendario de parches.',
    3,
    false,
    '2024-11-27 20:40:00+00'::timestamptz
  ),
  (
    'c3a7f9e4-5b6d-4e8f-9c2a-7d3e4f5a6b7c'::uuid,
    'a72de586-308d-4a32-b545-3a3aaa218414'::uuid, -- Milagros Soto
    'c4f8e9b1-2d3a-4f4b-8c6d-8e7a9b1c2d3e'::uuid,
    'emotional',
    'whatsapp',
    '2024-11-22 07:55:00+00'::timestamptz,
    26,
    'https://files.pausiva.test/whatsapp/milagros-soto-diario-emocional.json',
    'El asistente recogió escalada de ansiedad matutina y activó micro-ejercicios de respiración; paciente reporta alivio parcial.',
    7,
    false,
    '2024-11-22 07:55:00+00'::timestamptz
  ),
  (
    'd4b8a1f5-6c7e-4f9a-8d3b-8e4f5a6b7c8d'::uuid,
    'a72de586-308d-4a32-b545-3a3aaa218414'::uuid, -- Milagros Soto
    'd5a9f1c2-3e4b-4a5c-9d7e-9f8b1c2d3e4f'::uuid,
    'symptoms',
    'whatsapp',
    '2024-12-02 21:10:00+00'::timestamptz,
    34,
    'https://files.pausiva.test/whatsapp/milagros-soto-alerta-migrañas.html',
    'Bot registró 3 migrañas en 48h y recomendó hidratación forzada; bandera roja enviada a la Dra. Maldonado.',
    8,
    true,
    '2024-12-02 21:10:00+00'::timestamptz
  ),
  (
    'e5c9b2a6-7d8f-4a1b-9e4c-9f5a6b7c8d9e'::uuid,
    '7cbf5ff4-64b2-4a95-8ed5-18495df2da3b'::uuid, -- Lucia Villanueva
    'c7f2e3b4-5d6a-4f7b-8c9d-2e1a3b4c5d6e'::uuid,
    'business',
    'whatsapp',
    '2024-11-18 13:20:00+00'::timestamptz,
    9,
    'https://files.pausiva.test/whatsapp/lucia-villanueva-recordatorio-dexa.txt',
    'El bot recordó preparación para la densitometría DEXA y confirmó recepción de orden médica en PDF.',
    2,
    false,
    '2024-11-18 13:20:00+00'::timestamptz
  ),
  (
    'f6d0c3b7-8e9a-4b2c-8f5d-af6b7c8d9e0f'::uuid,
    'c1f9d666-e973-4d4d-8f5f-9ea5a7b3fe5d'::uuid, -- Marta Ayala
    'f7c2b3e4-5a6d-4c7e-9f9a-2b1d3e4f5a6b'::uuid,
    'other',
    'whatsapp',
    '2024-11-19 17:05:00+00'::timestamptz,
    14,
    'https://files.pausiva.test/whatsapp/marta-ayala-retoma-cita.html',
    'Chatbot verificó razones de la inasistencia y reprogramó recordatorios para la pre-consulta del 5 de diciembre.',
    5,
    false,
    '2024-11-19 17:05:00+00'::timestamptz
  )
on conflict (id) do update
set
  patient_id = excluded.patient_id,
  appointment_id = excluded.appointment_id,
  type = excluded.type,
  contacted_at = excluded.contacted_at,
  message_count = excluded.message_count,
  transcript_url = excluded.transcript_url,
  summary = excluded.summary,
  severity_score = excluded.severity_score,
  is_urgent = excluded.is_urgent,
  created_at = excluded.created_at;


