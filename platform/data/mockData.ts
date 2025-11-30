/**
 * @deprecated This file is no longer used in the application.
 * 
 * All mock data has been replaced with real API calls:
 * - Patient data: Use `usePatients` hook with `/api/users/patients`
 * - Appointments: Use `useAppointments` hook with `/api/appointments`
 * - Doctors: Use `useDoctors` hook with `/api/users/doctors`
 * 
 * This file is kept for reference purposes only.
 * It can be safely deleted once all team members are aware of the migration.
 * 
 * Last updated: 2025-11-30
 */

// ===================================================================
// DEPRECATED - DO NOT USE - Use real API endpoints instead
// ===================================================================

export interface Patient {
  id: string;
  name: string;
  age: number;
  avatar: string;
  lastVisit: string;
  priority: 'alta' | 'media' | 'baja';
  nextAppointment?: {
    date: string;
    time: string;
    type: string;
    doctor: string;
  };
  demographics: {
    phone: string;
    email: string;
    emergencyContact: string;
    address: string;
  };
  medicalHistory: {
    allergies: string[];
    currentMedications: string[];
    conditions: string[];
  };
  roadmap: {
    preConsultation?: {
      date: string;
      symptoms: string[];
    };
    virtualConsultation?: {
      date: string;
      time: string;
      duration: string;
      notes: string;
      recordingLink?: string;
    };
    diagnosis?: {
      date: string;
      diagnosis: string;
      plan: string;
      objectives: string[];
    };
    exams?: Array<{
      name: string;
      status: 'programado' | 'recomendado' | 'completado';
      date?: string;
      results?: string;
      notes?: string;
      files?: string[];
    }>;
    followUp?: Array<{
      date: string;
      notes: string;
      improvement: 'mejora' | 'estable' | 'empeoramiento';
    }>;
  };
  appointments: Array<{
    id: string;
    date: string;
    time: string;
    type: string;
    doctor: string;
    status: 'pendiente' | 'completada' | 'cancelada';
    locationType: 'virtual' | 'presencial';
    location?: string;
    duration?: string;
    symptoms?: string[];
    diagnosis?: string;
    notes?: string;
    prescriptions?: string[];
    nextSteps?: string;
  }>;
  whatsappConversations: number;
  lastInteraction: string;
}

export const mockPatients: Patient[] = [];

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  symptom: string;
  severity: 'alta' | 'media' | 'baja';
  date: string;
  time: string;
}

export const mockAlerts: Alert[] = [];

export interface Metric {
  label: string;
  value: number;
  change: number;
  icon: string;
}

export const mockMetrics: Metric[] = [];

/**
 * @deprecated Use `usePatients` hook with `id` parameter
 */
export const getPatientById = (id: string): Patient | undefined => {
  console.warn('getPatientById is deprecated. Use usePatients hook with id parameter instead.');
  return undefined;
};

/**
 * @deprecated Use `useAppointments` hook with date filters
 */
export const getTodaysPatients = () => {
  console.warn('getTodaysPatients is deprecated. Use useAppointments hook with date filters instead.');
  return [];
};
