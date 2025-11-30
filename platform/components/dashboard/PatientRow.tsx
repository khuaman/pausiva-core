import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Patient } from '@/data/mockData';

interface PatientRowProps {
  patient: Patient & { todayAppointment?: any };
  onViewProfile: (id: string) => void;
}

export const PatientRow = ({ patient, onViewProfile }: PatientRowProps) => {
  const appointment = patient.todayAppointment;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={patient.avatar} alt={patient.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{patient.name}</p>
            <p className="text-sm text-muted-foreground">{patient.age} años</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-foreground">
        {appointment?.time || '-'}
      </td>
      <td className="px-4 py-4 text-foreground">
        {appointment?.doctor || '-'}
      </td>
      <td className="px-4 py-4 text-foreground">
        {appointment?.type || '-'}
      </td>
      <td className="px-4 py-4">
        <Badge
          className={
            appointment?.status === 'completada'
              ? 'bg-success text-success-foreground'
              : appointment?.status === 'pendiente'
              ? 'bg-warning text-warning-foreground'
              : 'bg-gray-200 text-gray-800'
          }
        >
          {appointment?.status || 'Sin cita'}
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
