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

export const mockPatients: Patient[] = [
  {
    id: 'P001',
    name: 'Carmen López Rivera',
    age: 48,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carmen',
    lastVisit: '2024-03-15',
    priority: 'alta',
    nextAppointment: {
      date: '2024-04-10',
      time: '10:00',
      type: 'Consulta de seguimiento',
      doctor: 'Dra. María González',
    },
    demographics: {
      phone: '+51 999 888 777',
      email: 'carmen.lopez@email.com',
      emergencyContact: 'Juan López (esposo) +51 999 777 666',
      address: 'Av. Arequipa 1234, Lima, Perú',
    },
    medicalHistory: {
      allergies: ['Penicilina'],
      currentMedications: ['Terapia hormonal (Estradiol 1mg)', 'Calcio + Vitamina D'],
      conditions: ['Menopausia precoz', 'Osteopenia'],
    },
    roadmap: {
      preConsultation: {
        date: '2024-02-20',
        symptoms: ['Sofocos frecuentes', 'Sudoración nocturna', 'Cambios de humor', 'Insomnio'],
      },
      virtualConsultation: {
        date: '2024-03-01',
        time: '15:00',
        duration: '45 minutos',
        notes: 'Paciente presenta síntomas vasomotores moderados-severos. Calidad de sueño afectada significativamente. Se recomienda iniciar terapia hormonal después de exámenes.',
        recordingLink: '#',
      },
      diagnosis: {
        date: '2024-03-15',
        diagnosis: 'Menopausia precoz con síntomas vasomotores moderados-severos',
        plan: 'Iniciar terapia hormonal con Estradiol 1mg/día. Suplementación con Calcio y Vitamina D. Seguimiento mensual durante 3 meses.',
        objectives: [
          'Reducir frecuencia de sofocos en 70%',
          'Mejorar calidad de sueño',
          'Prevenir pérdida de densidad ósea',
          'Mejorar bienestar emocional',
        ],
      },
      exams: [
        {
          name: 'Mamografía',
          status: 'completado',
          date: '2024-03-10',
          results: 'Normal - BIRADS 1',
          notes: 'Estudio realizado sin contraindicaciones. Se recomienda control anual.',
          files: ['mamografia-2024-03-10.pdf', 'informe-radiologico.pdf'],
        },
        {
          name: 'Densitometría ósea',
          status: 'completado',
          date: '2024-03-12',
          results: 'Osteopenia leve en columna lumbar',
          notes: 'T-score: -1.5 en columna lumbar. Iniciar suplementación de calcio.',
          files: ['densitometria-2024-03-12.pdf'],
        },
        {
          name: 'Perfil hormonal',
          status: 'completado',
          date: '2024-03-08',
          results: 'FSH elevado, Estradiol bajo - Compatible con menopausia',
          notes: 'FSH: 85 mIU/ml, Estradiol: 15 pg/ml',
          files: ['perfil-hormonal-2024-03-08.pdf'],
        },
      ],
      followUp: [
        {
          date: '2024-03-25',
          notes: 'Paciente reporta reducción del 50% en sofocos. Mejor calidad de sueño. Sin efectos adversos de medicación.',
          improvement: 'mejora',
        },
      ],
    },
    appointments: [
      {
        id: 'A001',
        date: '2024-04-10',
        time: '10:00',
        type: 'Consulta de seguimiento',
        doctor: 'Dra. María González',
        status: 'pendiente',
        locationType: 'presencial',
        location: 'Clínica Pausiva - San Isidro',
      },
      {
        id: 'A002',
        date: '2024-03-15',
        time: '14:00',
        type: 'Consulta Virtual Ginecológica',
        doctor: 'Dra. María González',
        status: 'completada',
        locationType: 'virtual',
        location: 'Videollamada',
        duration: '45 minutos',
        symptoms: ['Sofocos intensos', 'Sudoración nocturna', 'Insomnio'],
        diagnosis: 'Síndrome climatérico moderado',
        notes: 'Paciente refiere sofocos que interfieren con su rutina diaria. Se observa buen estado general. Paciente motivada para iniciar tratamiento. Se explica plan terapéutico integral.',
        prescriptions: ['Terapia Hormonal: Estradiol 1mg/día', 'Suplemento de Calcio + Vitamina D'],
        nextSteps: 'Control en 3 meses. Evaluar respuesta a tratamiento hormonal. Solicitar densitometría ósea.',
      },
      {
        id: 'A003',
        date: '2024-03-01',
        time: '15:00',
        type: 'Consulta virtual inicial',
        doctor: 'Dra. María González',
        status: 'completada',
        locationType: 'virtual',
        location: 'Videollamada',
        duration: '50 minutos',
        symptoms: ['Sofocos frecuentes', 'Cambios de humor', 'Fatiga'],
        diagnosis: 'Menopausia precoz - evaluación inicial',
        notes: 'Primera consulta de evaluación. Paciente presenta sintomatología compatible con menopausia precoz. Se solicitan estudios para confirmar diagnóstico y descartar otras causas.',
        prescriptions: ['Ninguna en esta etapa - pendiente resultados de laboratorio'],
        nextSteps: 'Solicitar: FSH, Estradiol, TSH, Hemograma completo. Retornar con resultados en 2 semanas.',
      },
    ],
    whatsappConversations: 12,
    lastInteraction: '2024-03-28',
  },
  {
    id: 'P002',
    name: 'Rosa Martínez Soto',
    age: 52,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rosa',
    lastVisit: '2024-03-20',
    priority: 'media',
    nextAppointment: {
      date: '2024-04-05',
      time: '11:30',
      type: 'Consulta nutricional',
      doctor: 'Lic. Ana Torres',
    },
    demographics: {
      phone: '+51 988 777 666',
      email: 'rosa.martinez@email.com',
      emergencyContact: 'María Martínez (hija) +51 987 654 321',
      address: 'Jr. Lima 567, Miraflores, Lima',
    },
    medicalHistory: {
      allergies: [],
      currentMedications: ['Metformina 850mg', 'Atorvastatina 20mg'],
      conditions: ['Diabetes tipo 2', 'Dislipidemia', 'Menopausia'],
    },
    roadmap: {
      preConsultation: {
        date: '2024-03-05',
        symptoms: ['Aumento de peso', 'Fatiga', 'Sequedad vaginal', 'Bochornos ocasionales'],
      },
      virtualConsultation: {
        date: '2024-03-12',
        time: '10:00',
        duration: '40 minutos',
        notes: 'Paciente con comorbilidades. Enfoque en manejo integral incluyendo nutrición y control metabólico.',
      },
      diagnosis: {
        date: '2024-03-20',
        diagnosis: 'Menopausia con síndrome metabólico asociado',
        plan: 'Manejo no hormonal. Enfoque en cambios de estilo de vida, nutrición y ejercicio. Considerar terapia hormonal local para sequedad vaginal.',
        objectives: [
          'Reducir peso en 5kg en 3 meses',
          'Mejorar control glucémico',
          'Reducir síntomas vasomotores',
          'Mejorar calidad de vida',
        ],
      },
      exams: [
        {
          name: 'Hemoglobina glicosilada',
          status: 'completado',
          date: '2024-03-18',
          results: 'HbA1c: 7.2%',
          notes: 'Control metabólico aceptable. Continuar con tratamiento actual.',
          files: ['hba1c-2024-03-18.pdf'],
        },
        {
          name: 'Perfil lipídico',
          status: 'programado',
          notes: 'Programado para próxima semana. Acudir en ayunas de 12 horas.',
        },
      ],
      followUp: [],
    },
    appointments: [
      {
        id: 'A004',
        date: '2024-04-05',
        time: '11:30',
        type: 'Consulta nutricional',
        doctor: 'Lic. Ana Torres',
        status: 'pendiente',
        locationType: 'virtual',
        location: 'Videollamada',
      },
      {
        id: 'A005',
        date: '2024-03-20',
        time: '16:00',
        type: 'Consulta Nutricional',
        doctor: 'Lic. Ana Torres',
        status: 'completada',
        locationType: 'presencial',
        location: 'Clínica Pausiva - Miraflores',
        duration: '40 minutos',
        symptoms: ['Aumento de peso', 'Retención de líquidos', 'Fatiga'],
        diagnosis: 'Cambios metabólicos asociados a menopausia',
        notes: 'Se realiza evaluación nutricional completa. IMC: 28.5. Perímetro abdominal elevado. Paciente reporta ansiedad por comida en la noche y dificultad para mantener rutinas de ejercicio.',
        prescriptions: ['Plan alimenticio hipocalórico balanceado 1500 kcal', 'Omega 3 1000mg/día', 'Probióticos'],
        nextSteps: 'Seguimiento en 1 mes. Evaluar adherencia al plan nutricional. Control de peso semanal. Incorporar actividad física progresiva.',
      },
    ],
    whatsappConversations: 8,
    lastInteraction: '2024-03-26',
  },
  {
    id: 'P003',
    name: 'Patricia Vega Ruiz',
    age: 50,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=patricia',
    lastVisit: '2024-03-28',
    priority: 'baja',
    nextAppointment: {
      date: '2024-04-10',
      time: '09:00',
      type: 'Consulta psicológica',
      doctor: 'Psic. Laura Ramírez',
    },
    demographics: {
      phone: '+51 977 666 555',
      email: 'patricia.vega@email.com',
      emergencyContact: 'Carlos Vega (hermano) +51 976 543 210',
      address: 'Av. Larco 890, San Isidro, Lima',
    },
    medicalHistory: {
      allergies: ['Látex'],
      currentMedications: ['Sertralina 50mg', 'Omega 3'],
      conditions: ['Ansiedad generalizada', 'Menopausia'],
    },
    roadmap: {
      preConsultation: {
        date: '2024-03-10',
        symptoms: ['Ansiedad severa', 'Insomnio', 'Cambios de humor', 'Dificultad para concentrarse'],
      },
      virtualConsultation: {
        date: '2024-03-18',
        time: '14:00',
        duration: '50 minutos',
        notes: 'Paciente con alto componente emocional. Síntomas de ansiedad exacerbados por la transición menopáusica. Se recomienda abordaje multidisciplinario.',
      },
      diagnosis: {
        date: '2024-03-28',
        diagnosis: 'Menopausia con síntomas predominantemente psicológicos',
        plan: 'Terapia cognitivo-conductual semanal. Evaluación de ajuste de tratamiento farmacológico para ansiedad. Técnicas de relajación y mindfulness.',
        objectives: [
          'Reducir niveles de ansiedad',
          'Mejorar calidad de sueño',
          'Desarrollar estrategias de afrontamiento',
          'Mejorar bienestar emocional',
        ],
      },
      exams: [
        {
          name: 'Escala de ansiedad (GAD-7)',
          status: 'completado',
          date: '2024-03-15',
          results: 'Puntuación: 15 (Ansiedad moderada-severa)',
          notes: 'Se recomienda seguimiento semanal y evaluación de respuesta al tratamiento.',
          files: ['gad7-evaluacion-2024-03-15.pdf'],
        },
      ],
      followUp: [],
    },
    appointments: [
      {
        id: 'A006',
        date: '2024-04-10',
        time: '09:00',
        type: 'Consulta psicológica',
        doctor: 'Psic. Laura Ramírez',
        status: 'pendiente',
        locationType: 'virtual',
        location: 'Videollamada',
      },
      {
        id: 'A007',
        date: '2024-03-28',
        time: '15:00',
        type: 'Consulta Psicológica',
        doctor: 'Psic. Laura Ramírez',
        status: 'completada',
        locationType: 'presencial',
        location: 'Clínica Pausiva - San Isidro',
        duration: '50 minutos',
        symptoms: ['Ansiedad', 'Cambios de humor', 'Irritabilidad', 'Insomnio'],
        diagnosis: 'Síntomas emocionales asociados a transición menopáusica',
        notes: 'Primera sesión de evaluación psicológica. Paciente presenta buena introspección. Se identifica estrés laboral y familiar como factores contribuyentes. Buena disposición para terapia. Se trabaja en técnicas de regulación emocional.',
        prescriptions: ['Técnicas de respiración y mindfulness', 'Ejercicios de regulación emocional', 'Diario de emociones'],
        nextSteps: 'Sesiones semanales por 8 semanas. Evaluar necesidad de interconsulta con psiquiatría si síntomas persisten. Seguimiento de patrones de sueño.',
      },
    ],
    whatsappConversations: 15,
    lastInteraction: '2024-03-29',
  },
];

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  symptom: string;
  severity: 'alta' | 'media' | 'baja';
  date: string;
  time: string;
}

export const mockAlerts: Alert[] = [
  {
    id: 'AL001',
    patientId: 'P003',
    patientName: 'Patricia Vega Ruiz',
    symptom: 'Crisis de ansiedad severa reportada',
    severity: 'alta',
    date: '2024-03-29',
    time: '22:30',
  },
  {
    id: 'AL002',
    patientId: 'P001',
    patientName: 'Carmen López Rivera',
    symptom: 'Sangrado inesperado',
    severity: 'alta',
    date: '2024-03-29',
    time: '14:15',
  },
  {
    id: 'AL003',
    patientId: 'P002',
    patientName: 'Rosa Martínez Soto',
    symptom: 'Niveles de glucosa elevados persistentes',
    severity: 'media',
    date: '2024-03-28',
    time: '18:00',
  },
];

export interface Metric {
  label: string;
  value: number;
  change: number;
  icon: string;
}

export const mockMetrics: Metric[] = [
  {
    label: 'Total de Consultas',
    value: 156,
    change: 12,
    icon: 'calendar',
  },
  {
    label: 'Consultas Pendientes',
    value: 8,
    change: -15,
    icon: 'clock',
  },
  {
    label: 'Seguimientos Activos',
    value: 42,
    change: 8,
    icon: 'activity',
  },
  {
    label: 'Pacientes del Día',
    value: 3,
    change: 0,
    icon: 'users',
  },
];

export const getTodaysPatients = () => {
  const today = new Date().toISOString().split('T')[0];
  return mockPatients
    .filter((patient) => 
      patient.appointments.some(
        (apt) => apt.date === today || apt.date === '2024-04-10'
      )
    )
    .map((patient) => {
      const todayAppointment = patient.appointments.find(
        (apt) => apt.date === today || apt.date === '2024-04-10'
      );
      return {
        ...patient,
        todayAppointment,
      };
    });
};

export const getPatientById = (id: string) => {
  return mockPatients.find((patient) => patient.id === id);
};
