-- Datos de prueba para la tabla plans basados en citas reales.
-- Cada plan refleja indicaciones médicas redactadas en español.

insert into public.plans (
  id,
  appointment_id,
  start_date,
  end_date,
  plan,
  created_at,
  updated_at
)
values
  (
    '33b7121f-1f8c-4e09-b350-7ff28c4a7b6d'::uuid,
    'e9b4a5d6-7f8c-4b9d-8e2f-4a3c5d6e7f8a'::uuid, -- Veronica Rivas, seguimiento post-laboratorios
    '2024-11-13'::date,
    '2024-12-31'::date,
    '{
      "formato": "url",
      "titulo": "Plan hormonal y de estilo de vida noviembre 2024",
      "url": "https://files.pausiva.test/planes/veronica-rivas-seguimiento-nov-2024.pdf",
      "indicaciones": [
        "Mantener parche transdérmico de estradiol 50 mcg/24h, cambio cada lunes",
        "Registrar intensidad de bochornos en la app dos veces al día",
        "Añadir magnesio glicinato 200 mg nocturno para higiene del sueño"
      ],
      "alertas": "Reportar sangrado intermenstrual o bochornos >6 por día"
    }'::jsonb,
    '2024-11-12 12:35:00+00'::timestamptz,
    '2024-11-12 12:35:00+00'::timestamptz
  ),
  (
    '4c8cf6a2-5b6a-4a37-9d5c-1e2f3a4b5c6d'::uuid,
    'f1c5b6e7-8a9d-4c1e-9f3a-5b4d6e7f8a9b'::uuid, -- Veronica Rivas, control de mantenimiento
    '2024-11-27'::date,
    '2025-01-10'::date,
    '{
      "formato": "notas",
      "titulo": "Plan de mantenimiento y refuerzo conductual",
      "notas": [
        "Continuar con TRH actual; evaluar reducción gradual en marzo 2025",
        "Programa de fuerza 3x/semana con énfasis en columna lumbar",
        "Hidratación mínima de 2L/día y limitar cafeína a antes de las 14:00"
      ],
      "recordatorios": [
        "Enviar registros de síntomas vía WhatsApp cada viernes",
        "Compartir resultados de wearable si el sueño cae <80% de eficiencia"
      ]
    }'::jsonb,
    '2024-11-26 18:00:00+00'::timestamptz,
    '2024-11-26 18:00:00+00'::timestamptz
  ),
  (
    '5f9d2c4b-8e1a-41f5-9c7d-4a0f9d2c3b4e'::uuid,
    'c7f2e3b4-5d6a-4f7b-8c9d-2e1a3b4c5d6e'::uuid, -- Lucia Villanueva, consulta completada
    '2024-11-16'::date,
    '2025-05-15'::date,
    '{
      "formato": "url",
      "titulo": "Plan óseo y metabólico",
      "url": "https://files.pausiva.test/planes/lucia-villanueva-dexa-2024.pdf",
      "indicaciones": [
        "Continuar citrato de calcio 600 mg + vitamina D3 2000 UI diarios",
        "Programar densitometría DEXA para marzo 2025",
        "Caminatas con carga de 30 minutos, 5 veces por semana"
      ],
      "seguimiento": {
        "responsable": "Dra. Sofía Paredes",
        "frecuencia": "control virtual cada 6 meses"
      }
    }'::jsonb,
    '2024-11-15 11:50:00+00'::timestamptz,
    '2024-11-15 11:50:00+00'::timestamptz
  ),
  (
    '6a1b3c5d-7e9f-4a2b-8c1d-5e6f7a8b9c0d'::uuid,
    'c4f8e9b1-2d3a-4f4b-8c6d-8e7a9b1c2d3e'::uuid, -- Milagros Soto, seguimiento de salud mental
    '2024-11-21'::date,
    null,
    '{
      "formato": "notas",
      "titulo": "Plan integral de regulación emocional",
      "notas": [
        "Mantener sertralina 50 mg hasta nueva evaluación",
        "Rutina de respiración 4-7-8 antes de dormir y registro en diario",
        "Sesiones de TCC virtuales quincenales coordinadas por Pausiva"
      ],
      "apoyos": [
        "Bot de WhatsApp enviará micro-retos de sueño lunes/miércoles/viernes",
        "Compartir métricas del wearable cada domingo"
      ]
    }'::jsonb,
    '2024-11-20 15:35:00+00'::timestamptz,
    '2024-11-20 15:35:00+00'::timestamptz
  )
on conflict (id) do update
set
  appointment_id = excluded.appointment_id,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  plan = excluded.plan,
  updated_at = excluded.updated_at;


