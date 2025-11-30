"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDoctors } from '@/hooks/use-doctors';
import { useDataRefetch } from '@/contexts/DataRefetchContext';
import { Search, Filter, AlertCircle, Mail, Phone, Stethoscope, Users } from 'lucide-react';

export default function DoctoresPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { doctors, loading, error, refetch } = useDoctors({ limit: 50 });
  const { registerDoctorsRefetch } = useDataRefetch();

  // Register the refetch function so AdminCreateMenu can trigger it
  useEffect(() => {
    registerDoctorsRefetch(refetch);
  }, [refetch, registerDoctorsRefetch]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) =>
      doctor.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.metadata.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [doctors, searchTerm]);

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
          Equipo Médico
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o especialidad..."
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
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar doctores: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Summary */}
        <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span><strong className="text-foreground">{doctors.length}</strong> doctores</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span><strong className="text-foreground">{new Set(doctors.map(d => d.metadata.specialty)).size}</strong> especialidades</span>
          </div>
          {searchTerm && (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span><strong className="text-foreground">{filteredDoctors.length}</strong> resultados</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando equipo médico...
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? 'No se encontraron doctores con ese criterio de búsqueda' : 'No hay doctores registrados'}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Doctor
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Especialidad
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    CMP
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr 
                    key={doctor.id} 
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={doctor.profile.pictureUrl || undefined} alt={doctor.profile.fullName} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {doctor.profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{doctor.profile.fullName}</p>
                          {doctor.metadata.dni && (
                            <p className="text-xs text-muted-foreground">DNI: {doctor.metadata.dni}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-foreground">
                      {doctor.metadata.specialty}
                    </td>
                    <td className="px-4 py-4 text-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{doctor.profile.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-foreground">
                      {doctor.profile.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{doctor.profile.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-foreground">
                      {doctor.metadata.cmp}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/doctor/${doctor.id}`)}
                      >
                        Ver Perfil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

