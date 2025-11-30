import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ApiPatient } from '@/app/api/users/types';
import type { ApiAppointmentSummary } from '@/app/api/appointments/types';

interface PatientRowProps {
  patient: ApiPatient;
  todayAppointment?: ApiAppointmentSummary;
  onViewProfile: (id: string) => void;
}

export const PatientRow = ({ patient, todayAppointment, onViewProfile }: PatientRowProps) => {
  // Calculate age from birthDate if available
  const age = patient.profile.birthDate 
    ? Math.floor((new Date().getTime() - new Date(patient.profile.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

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
            {age && <p className="text-sm text-muted-foreground">{age} años</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-foreground">
        {todayAppointment 
          ? new Date(todayAppointment.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : '-'}
      </td>
      <td className="px-4 py-4 text-foreground">
        {todayAppointment?.doctor.fullName || '-'}
      </td>
      <td className="px-4 py-4 text-foreground">
        {todayAppointment?.type || '-'}
      </td>
      <td className="px-4 py-4">
        <Badge
          className={
            todayAppointment?.status === 'completed'
              ? 'bg-success text-success-foreground'
              : todayAppointment?.status === 'scheduled' || todayAppointment?.status === 'rescheduled'
              ? 'bg-warning text-warning-foreground'
              : 'bg-gray-200 text-gray-800'
          }
        >
          {todayAppointment?.status === 'completed' 
            ? 'completada' 
            : todayAppointment?.status === 'scheduled' 
            ? 'programada'
            : todayAppointment?.status === 'rescheduled'
            ? 'reprogramada'
            : 'Sin cita'}
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
