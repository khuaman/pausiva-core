# Resumen del Proyecto Actualizado

## Contexto del Problema

En Perú, aproximadamente 4,109,396 mujeres entre 40 y 59 años están en riesgo de experimentar perimenopausia y menopausia en 2025. La menopausia está mal atendida y afecta significativamente la salud física y emocional de las mujeres entre 40 y 60 años.

## Solución Propuesta

Acompañamiento integral a mujeres con menopausia desde tres perspectivas complementarias:

- **Logística**: Facilitación del acceso a servicios
- **Sintomatología**: Manejo de síntomas físicos
- **Emocional**: Soporte psicológico y bienestar

### Pilares de la Propuesta de Valor

1. **Consulta Ginecológica, Nutricional y Psicológica**: Atención médica integral especializada
2. **Seguimiento Sintomatológico**: Monitoreo continuo de síntomas
3. **Historial, resultados, agendar citas y recetas online**: Gestión digital centralizada
4. **Educación**: Contenido para entender qué está pasando durante la menopausia

### Dashboard de Gestión (Nuevo Componente)

**Tipos de Usuarios:**

- **Admin**: Gestiona el agendamiento para los doctores
- **Doctores en ginecología**: Acceso completo a información de pacientes
- **Usuario/Paciente**: Acceso a vista personal con su información como paciente

**Módulos Principales del Dashboard:**

**1. Dashboard Principal**

- Lista de pacientes del día y sus doctores asignados
- Alertas urgentes de pacientes (síntomas graves reportados)
- Métricas rápidas: consultas pendientes, seguimientos activos, total de consultas

**2. Perfil de Paciente (Vista Unificada para Doctores)**

El doctor puede visualizar por cada paciente:

- **Historia Clínica**: Información médica completa
- **Cantidad Conversaciones WhatsApp**: Historial de interacciones por whatsapp. Solo número para esta primera versión
- **Citas**: Registro de citas pasadas y futuras
- **Roadmap del Plan de Atención**:
    - Pre-consulta (síntomas iniciales del bot)
    - Consulta Virtual (notas + grabación)
    - Diagnóstico & Plan
    - Exámenes (órdenes + resultados)
    - Seguimiento (evolución de síntomas captados a traves de conversaciones por whatsapp)

## Mercado Objetivo

- **Público primario**: Mujeres de 40 a 60 años en LatAM
- **Público secundario**:
    - Médicos independientes
    - Aseguradoras (una vez alcanzado volumen/comisión)

## Journey del Usuario Actual

**1. Agenda cita**: Entrada a Calendly para agendar cita diagnóstica

**2. Cita virtual**: Ingreso a cita, validación de síntomas, recopilación de información, revisión histórica médica y determinación de pruebas necesarias

**3. Primera cita con el ginecobstetra**: Consulta física presencial

**4. Análisis de laboratorio**: Realización de exámenes requeridos

**5. Lectura de resultados y plan de acción**: Interpretación de resultados y definición de tratamiento

**6. Plan de acompañamiento**: Monitoreo diario de síntomas, soporte nutricional, salud mental, seguimiento anticonceptivo, educación sobre menopausia, comunidad WhatsApp, beneficios exclusivos y eventos con expertos

## 1. **Dashboard Principal**

- Lista de pacientes del día
- Alertas urgentes (síntomas graves reportados)
- Métricas rápidas (consultas pendientes, seguimientos activos)

## 2. **Perfil de Paciente** (Vista Unificada)

`├── Historia Clínica
├── Conversaciones WhatsApp (transcript completo)
├── Citas (pasadas y futuras)
└── Línea de Tiempo
    ├── Pre-consulta (síntomas iniciales del bot)
    ├── Consulta Virtual (notas + grabación)
    ├── Diagnóstico & Plan
    ├── Exámenes (órdenes + resultados)
    └── Seguimiento (evolución síntomas)`

Estoy armando el dashboard para el administrador de ginecologos del pai

1. Dashboard Principal

- Lista de pacientes del día
- Alertas urgentes (síntomas graves reportados)
- Métricas rápidas (consultas pendientes, seguimientos activos)

2. Perfil de Paciente (Vista Unificada)

`├── Historia Clínica ├── Conversaciones WhatsApp (transcript completo) ├── Citas (pasadas y futuras) └── Línea de Tiempo ├── Pre-consulta (síntomas iniciales del bot) ├── Consulta Virtual (notas + grabación) ├── Diagnóstico & Plan ├── Exámenes (órdenes + resultados) └── Seguimiento (evolución síntomas)`