-- Datos de prueba para la tabla de citas que cubren tres escenarios clave:
-- 1. Pre-consulta: Paciente sin doctor asignado aún
-- 2. Consulta: Cita completada con notas médicas
-- 3. Múltiples Consultas: Pacientes con 2+ citas mostrando continuidad de atención
-- Idempotente: se puede volver a ejecutar de forma segura sin duplicar registros.

-- IDs de Pacientes (de patients.sql):
-- Veronica Rivas:  3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2
-- Lucia Villanueva: 7cbf5ff4-64b2-4a95-8ed5-18495df2da3b
-- Milagros Soto: a72de586-308d-4a32-b545-3a3aaa218414
-- Marta Ayala: c1f9d666-e973-4d4d-8f5f-9ea5a7b3fe5d

-- IDs de Doctoras (de doctors.sql):
-- Dra. Gabriela Montes: 0f4fb833-86b4-4465-8eb7-9c0f822ab0e0
-- Dra. Sofía Paredes: 1ea680d2-1b91-4dd5-9b3e-61795073aa27
-- Dra. Teresa Maldonado: 3c8d1f8c-5eac-4c0c-9a42-0e01ef3d8891

insert into public.appointments (
  id,
  patient_id,
  doctor_id,
  type,
  status,
  scheduled_at,
  notes,
  created_at,
  updated_at
)
values
  -- ========================================================================
  -- CASO DE USO 1: PRE-CONSULTA
  -- Marta Ayala tiene una pre-consulta programada (sin doctor asignado aún)
  -- Estado: programada, cita futura
  -- ========================================================================
  (
    'b8e5d1a2-3c4f-4e8a-9b2d-1f6a8c3e5d7a'::uuid,
    'c1f9d666-e973-4d4d-8f5f-9ea5a7b3fe5d'::uuid, -- Marta Ayala
    '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid, -- Dra. Gabriela Montes
    'pre_consulta',
    'scheduled',
    '2024-12-05 14:00:00+00'::timestamptz,
    null,
    '2024-11-25 10:30:00+00'::timestamptz,
    '2024-11-25 10:30:00+00'::timestamptz
  ),

  -- ========================================================================
  -- CASO DE USO 2: CONSULTA (COMPLETADA)
  -- Lucia Villanueva tuvo una consulta que ya ocurrió
  -- Estado: completada, con notas detalladas del doctor
  -- ========================================================================
  (
    'c7f2e3b4-5d6a-4f7b-8c9d-2e1a3b4c5d6e'::uuid,
    '7cbf5ff4-64b2-4a95-8ed5-18495df2da3b'::uuid, -- Lucia Villanueva
    '1ea680d2-1b91-4dd5-9b3e-61795073aa27'::uuid, -- Dra. Sofía Paredes
    'consulta',
    'completed',
    '2024-11-15 10:30:00+00'::timestamptz,
    'Paciente presenta preocupación por densidad ósea. Examen físico sin hallazgos relevantes. Se discute continuación de citrato de calcio 600mg y vitamina D3 2000UI. Se ordena densitometría ósea (DEXA) para monitoreo de osteoporosis. Paciente reporta mejoría en calidad de sueño y reducción de bochornos. Plan: Seguimiento en 6 meses con resultados de DEXA. Continuar régimen actual de medicamentos.',
    '2024-11-10 09:00:00+00'::timestamptz,
    '2024-11-15 11:45:00+00'::timestamptz
  ),

  -- ========================================================================
  -- CASO DE USO 3: MÚLTIPLES CONSULTAS
  -- Veronica Rivas tiene múltiples citas mostrando continuidad de atención
  -- ========================================================================
  
  -- Primera pre-consulta (completada)
  (
    'd8a3f4c5-6e7b-4a8c-9d1e-3f2b4c5d6e7f'::uuid,
    '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid, -- Veronica Rivas
    '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid, -- Dra. Gabriela Montes
    'pre_consulta',
    'completed',
    '2024-10-15 15:00:00+00'::timestamptz,
    'Consulta inicial. Paciente reporta bochornos moderados, sudores nocturnos y fluctuaciones de ánimo. Actualmente en parche transdérmico de estradiol 50mcg. Se nota antecedente familiar de cáncer de mama - se discuten riesgos y beneficios. Signos vitales estables. Plan: Continuar TRH actual, ordenar perfil hormonal y mamografía.',
    '2024-10-10 08:20:00+00'::timestamptz,
    '2024-10-15 16:15:00+00'::timestamptz
  ),

  -- Consulta de seguimiento (completada)
  (
    'e9b4a5d6-7f8c-4b9d-8e2f-4a3c5d6e7f8a'::uuid,
    '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid, -- Veronica Rivas
    '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid, -- Dra. Gabriela Montes
    'consulta',
    'completed',
    '2024-11-12 11:00:00+00'::timestamptz,
    'Visita de seguimiento para revisar laboratorios e imágenes. Perfil hormonal muestra niveles de estradiol dentro del rango objetivo. Resultados de mamografía normales - autorizada para continuar TRH. Paciente reporta mejoría significativa en bochornos (disminuyeron de 8-10/día a 2-3/día). Calidad de sueño mejorada. Se discuten modificaciones de estilo de vida y régimen de suplementos. Paciente prefiere WhatsApp para seguimientos.',
    '2024-11-05 14:00:00+00'::timestamptz,
    '2024-11-12 12:30:00+00'::timestamptz
  ),

  -- Consulta reciente (completada)
  (
    'f1c5b6e7-8a9d-4c1e-9f3a-5b4d6e7f8a9b'::uuid,
    '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid, -- Veronica Rivas
    '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid, -- Dra. Gabriela Montes
    'consulta',
    'completed',
    '2024-11-26 16:30:00+00'::timestamptz,
    'Seguimiento de rutina. Paciente está bien con el régimen actual. No se reportan efectos adversos. Puntaje de síntomas mejoró a 4/10. Se discute nutrición y ejercicio. Paciente monitorea síntomas vía app. Continuar parche de estradiol 50mcg. Próxima cita en 6 semanas.',
    '2024-11-20 10:00:00+00'::timestamptz,
    '2024-11-26 17:45:00+00'::timestamptz
  ),

  -- Consulta próxima (programada)
  (
    'a2d6c7f8-9b1e-4d2f-8a4b-6c5e7f8a9b1c'::uuid,
    '3d3c8f81-6e58-4ba7-bf1a-a19fceb655c2'::uuid, -- Veronica Rivas
    '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid, -- Dra. Gabriela Montes
    'consulta',
    'scheduled',
    '2025-01-08 10:00:00+00'::timestamptz,
    null,
    '2024-11-26 17:50:00+00'::timestamptz,
    '2024-11-26 17:50:00+00'::timestamptz
  ),

  -- ========================================================================
  -- CASOS ADICIONALES: Múltiples citas para Milagros Soto
  -- ========================================================================
  
  -- Pre-consulta inicial (completada)
  (
    'b3e7d8a9-1c2f-4e3a-9b5c-7d6f8a9b1c2d'::uuid,
    'a72de586-308d-4a32-b545-3a3aaa218414'::uuid, -- Milagros Soto
    '3c8d1f8c-5eac-4c0c-9a42-0e01ef3d8891'::uuid, -- Dra. Teresa Maldonado
    'pre_consulta',
    'completed',
    '2024-11-01 09:00:00+00'::timestamptz,
    'Primera visita. Paciente presenta niveles altos de ansiedad y alteraciones del sueño relacionadas con perimenopausia temprana. Actualmente en sertralina 50mg. Reporta migrañas frecuentes. Puntaje de síntomas 8/10. Se discute enfoque integrativo combinando apoyo de salud mental y manejo hormonal. Paciente usa dispositivo wearable para monitoreo.',
    '2024-10-28 15:30:00+00'::timestamptz,
    '2024-11-01 10:15:00+00'::timestamptz
  ),

  -- Consulta de seguimiento (completada)
  (
    'c4f8e9b1-2d3a-4f4b-8c6d-8e7a9b1c2d3e'::uuid,
    'a72de586-308d-4a32-b545-3a3aaa218414'::uuid, -- Milagros Soto
    '3c8d1f8c-5eac-4c0c-9a42-0e01ef3d8891'::uuid, -- Dra. Teresa Maldonado
    'consulta',
    'completed',
    '2024-11-20 14:00:00+00'::timestamptz,
    'Consulta de seguimiento. Paciente reporta mejoría moderada en calidad de sueño con intervenciones conductuales. Niveles de ansiedad disminuyendo. Frecuencia de migrañas reducida de 10/mes a 6/mes. Datos del wearable muestran mejoría en arquitectura del sueño. Se discute posible ajuste de dosis de sertralina. Continuar enfoque actual con referencia a terapia cognitivo-conductual. Paciente prefiere WhatsApp y SMS para comunicación.',
    '2024-11-15 11:00:00+00'::timestamptz,
    '2024-11-20 15:30:00+00'::timestamptz
  ),

  -- Cita próxima (programada)
  (
    'd5a9f1c2-3e4b-4a5c-9d7e-9f8b1c2d3e4f'::uuid,
    'a72de586-308d-4a32-b545-3a3aaa218414'::uuid, -- Milagros Soto
    '3c8d1f8c-5eac-4c0c-9a42-0e01ef3d8891'::uuid, -- Dra. Teresa Maldonado
    'consulta',
    'scheduled',
    '2024-12-18 13:30:00+00'::timestamptz,
    null,
    '2024-11-20 15:35:00+00'::timestamptz,
    '2024-11-20 15:35:00+00'::timestamptz
  ),

  -- ========================================================================
  -- CASOS EXTREMOS: Citas canceladas y ausencias
  -- ========================================================================
  
  -- Cita cancelada
  (
    'e6b1a2d3-4f5c-4b6d-8e8f-1a9c2d3e4f5a'::uuid,
    '7cbf5ff4-64b2-4a95-8ed5-18495df2da3b'::uuid, -- Lucia Villanueva
    '1ea680d2-1b91-4dd5-9b3e-61795073aa27'::uuid, -- Dra. Sofía Paredes
    'consulta',
    'cancelled',
    '2024-11-22 09:00:00+00'::timestamptz,
    'Paciente solicitó cancelación debido a emergencia familiar.',
    '2024-11-15 16:00:00+00'::timestamptz,
    '2024-11-21 14:20:00+00'::timestamptz
  ),

  -- Cita sin presentarse
  (
    'f7c2b3e4-5a6d-4c7e-9f9a-2b1d3e4f5a6b'::uuid,
    'c1f9d666-e973-4d4d-8f5f-9ea5a7b3fe5d'::uuid, -- Marta Ayala
    '0f4fb833-86b4-4465-8eb7-9c0f822ab0e0'::uuid, -- Dra. Gabriela Montes
    'consulta',
    'no_show',
    '2024-11-18 10:00:00+00'::timestamptz,
    'Paciente no asistió a la cita programada. No se recibió notificación previa.',
    '2024-11-10 13:00:00+00'::timestamptz,
    '2024-11-18 10:30:00+00'::timestamptz
  )

on conflict (id) do update
set
  patient_id = excluded.patient_id,
  doctor_id = excluded.doctor_id,
  type = excluded.type,
  status = excluded.status,
  scheduled_at = excluded.scheduled_at,
  notes = excluded.notes,
  updated_at = excluded.updated_at;

