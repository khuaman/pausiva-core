import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ApiPatient } from '@/app/api/users/types';

interface PatientListRowProps {
  patient: ApiPatient;
  onViewProfile: (id: string) => void;
}

export const PatientListRow = ({ patient, onViewProfile }: PatientListRowProps) => {
  const clinicalProfile = patient.metadata.clinicalProfile as any;
  const menopauseStage = clinicalProfile?.menopause_stage || 'No especificado';
  const symptomScore = clinicalProfile?.symptom_score || 0;
  
  // Calculate age from birth date
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Determine priority based on symptom score and risk factors
  const getPriority = () => {
    const riskFactors = clinicalProfile?.risk_factors || [];
    if (symptomScore >= 7 || riskFactors.length >= 2) return 'alta';
    if (symptomScore >= 4 || riskFactors.length >= 1) return 'media';
    return 'baja';
  };

  const priority = getPriority();
  const age = calculateAge(patient.profile.birthDate);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={patient.profile.pictureUrl || undefined} alt={patient.profile.fullName} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {patient.profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{patient.profile.fullName}</p>
            <p className="text-sm text-muted-foreground">{age} años</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-foreground capitalize">
        {menopauseStage.replace(/_/g, ' ')}
      </td>
      <td className="px-4 py-4 text-foreground">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
            <div 
              className={`h-2 rounded-full ${
                symptomScore >= 7 ? 'bg-red-500' : 
                symptomScore >= 4 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(symptomScore * 10, 100)}%` }}
            />
          </div>
          <span className="text-sm">{symptomScore}/10</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge
          className={
            priority === 'alta'
              ? 'bg-red-100 text-red-800 hover:bg-red-200'
              : priority === 'media'
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }
        >
          {priority.toUpperCase()}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewProfile(patient.id)}
        >
          Ver Perfil
        </Button>
      </td>
    </tr>
  );
};

