import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  change: number;
  icon: LucideIcon;
}

export const MetricCard = ({ label, value, change, icon: Icon }: MetricCardProps) => {
  const isPositive = change >= 0;

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
            <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
            {change !== 0 && (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <ArrowUp className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-destructive" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {Math.abs(change)}%
                </span>
                <span className="text-xs text-muted-foreground">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
