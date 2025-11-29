import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock } from 'lucide-react';
import { Alert } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AlertCardProps {
  alert: Alert;
  onViewDetail: (patientId: string) => void;
}

export const AlertCard = ({ alert, onViewDetail }: AlertCardProps) => {
  const severityColors = {
    alta: 'bg-destructive text-destructive-foreground',
    media: 'bg-warning text-warning-foreground',
    baja: 'bg-info text-info-foreground',
  };

  return (
    <Card className="border-l-4 border-destructive">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-foreground">{alert.patientName}</p>
              <Badge className={severityColors[alert.severity]}>
                {alert.severity}
              </Badge>
            </div>
            <p className="text-sm text-foreground mb-2">{alert.symptom}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {format(new Date(alert.date), "d 'de' MMMM", { locale: es })} a las {alert.time}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onViewDetail(alert.patientId)}
          >
            Ver Detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
