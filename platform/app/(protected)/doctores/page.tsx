"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDoctors } from '@/hooks/use-doctors';
import { useDataRefetch } from '@/contexts/DataRefetchContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, AlertCircle, Mail, Phone, Stethoscope, Users, Trash2 } from 'lucide-react';

export default function DoctoresPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { doctors, loading, error, refetch } = useDoctors({ limit: 50 });
  const { registerDoctorsRefetch } = useDataRefetch();
  const { toast } = useToast();
  const [doctorToDelete, setDoctorToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Register the refetch function so AdminCreateMenu can trigger it
  useEffect(() => {
    registerDoctorsRefetch(refetch);
  }, [refetch, registerDoctorsRefetch]);

  const handleDeleteDoctor = async () => {
    if (!doctorToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/doctors?id=${doctorToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Doctor eliminado',
          description: 'El doctor ha sido eliminado exitosamente.',
        });
        refetch();
      } else if (response.status === 409 && data.details) {
        // Handle dependency conflict
        const details = data.details;
        let message = data.error;
        
        if (details.appointmentsCount) {
          message += ` Tiene ${details.appointmentsCount} cita${details.appointmentsCount > 1 ? 's' : ''} registrada${details.appointmentsCount > 1 ? 's' : ''}.`;
        }
        
        toast({
          title: 'No se puede eliminar',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el doctor.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al eliminar el doctor.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDoctorToDelete(null);
    }
  };

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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/doctor/${doctor.id}`)}
                        >
                          Ver Perfil
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDoctorToDelete(doctor.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!doctorToDelete} onOpenChange={(open) => !open && setDoctorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el doctor y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoctor}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

