export type UserProfile = {
    fullName: string;
    email: string;
    phone: string | null;
    birthDate: string | null;
    pictureUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  
export type PatientMetadata = {
    dni: string;
    clinicalProfile: Record<string, unknown> | null;
};

export type DoctorMetadata = {
    dni: string | null;
    cmp: string;
    specialty: string;
};
