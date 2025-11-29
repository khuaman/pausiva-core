"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { mockPatients } from '@/data/mockData';
import { Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PacientesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = mockPatients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
          Pacientes
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="card-hover cursor-pointer" onClick={() => router.push(`/paciente/${patient.id}`)}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                    <AvatarImage src={patient.avatar} alt={patient.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-base">
                      {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{patient.name}</h3>
                      <Badge 
                        variant={
                          patient.priority === 'alta' ? 'destructive' : 
                          patient.priority === 'media' ? 'default' : 
                          'secondary'
                        }
                        className="text-xs w-fit"
                      >
                        <span className="hidden sm:inline">
                          {patient.priority === 'alta' ? 'Alta prioridad' : 
                           patient.priority === 'media' ? 'Prioridad media' : 
                           'Baja prioridad'}
                        </span>
                        <span className="sm:hidden">
                          {patient.priority === 'alta' ? 'Alta' : 
                           patient.priority === 'media' ? 'Media' : 
                           'Baja'}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{patient.age} años</p>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Última visita</p>
                    <p className="text-xs sm:text-sm text-foreground">
                      {format(new Date(patient.lastVisit), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>

                  {patient.nextAppointment && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Próxima cita</p>
                      <p className="text-xs sm:text-sm text-foreground">
                        {format(new Date(patient.nextAppointment.date), "d 'de' MMM", { locale: es })} - {patient.nextAppointment.time}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                    {patient.medicalHistory.conditions.slice(0, 2).map((condition) => (
                      <Badge key={condition} variant="outline" className="text-xs">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button className="w-full mt-3 sm:mt-4" size="sm">
                  Ver Perfil Completo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

