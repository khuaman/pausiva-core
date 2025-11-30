/**
 * AlertCard Component
 * 
 * This component is currently not used in the application.
 * It was designed to display patient alerts/notifications.
 * 
 * To use this component, you would need to:
 * 1. Create an alerts API endpoint (e.g., /api/alerts)
 * 2. Create a useAlerts hook to fetch alerts data
 * 3. Integrate it into the dashboard or relevant pages
 * 
 * For now, the application uses the Alert component from @/components/ui/alert
 * for displaying system messages and notifications.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type AlertSeverity = 'alta' | 'media' | 'baja';

interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  symptom: string;
  severity: AlertSeverity;
  date: string;
  time: string;
}

interface AlertCardProps {
  alert: Alert;
  onViewDetail: (patientId: string) => void;
}

export const AlertCard = ({ alert, onViewDetail }: AlertCardProps) => {
  const severityColors: Record<AlertSeverity, string> = {
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
