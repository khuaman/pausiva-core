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
import { usePatients } from '@/hooks/use-patients';
import { useDataRefetch } from '@/contexts/DataRefetchContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, AlertCircle, Trash2, MessageCircle } from 'lucide-react';

export default function PacientesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { patients, loading, error, refetch } = usePatients({ limit: 50, includeStats: true });
  const { registerPatientsRefetch } = useDataRefetch();
  const { toast } = useToast();
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Register the refetch function so AdminCreateMenu can trigger it
  useEffect(() => {
    registerPatientsRefetch(refetch);
  }, [refetch, registerPatientsRefetch]);

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/patients?id=${patientToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Paciente eliminado',
          description: 'El paciente ha sido eliminado exitosamente.',
        });
        refetch();
      } else if (response.status === 409 && data.details) {
        // Handle dependency conflict - show detailed message
        toast({
          title: 'No se puede eliminar',
          description: data.error,
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo eliminar el paciente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al eliminar el paciente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setPatientToDelete(null);
    }
  };

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

  // Open WhatsApp chat with patient
  const handleContactWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast({
        title: 'Sin número de teléfono',
        description: 'Este paciente no tiene un número de teléfono registrado.',
        variant: 'destructive',
      });
      return;
    }
    
    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Open WhatsApp (works on both mobile and desktop)
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) =>
      patient.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.profile.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

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
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar pacientes: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Summary */}
        <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span><strong className="text-foreground">{patients.length}</strong> pacientes</span>
          </div>
          {searchTerm && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span><strong className="text-foreground">{filteredPatients.length}</strong> resultados</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando pacientes...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? 'No se encontraron pacientes con ese criterio de búsqueda' : 'No hay pacientes registrados'}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Última consulta
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const age = calculateAge(patient.profile.birthDate);
                  const lastAppointmentDate = patient.stats?.lastAppointmentDate;
                  
                  // Format the last appointment date
                  const formatDate = (dateString: string | null | undefined) => {
                    if (!dateString) return 'Sin citas';
                    const date = new Date(dateString);
                    return date.toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    });
                  };

                  return (
                    <tr 
                      key={patient.id} 
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
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
                            <p className="text-xs text-muted-foreground">{age} años</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">
                          {formatDate(lastAppointmentDate)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactWhatsApp(patient.profile.phone)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Contactar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/paciente/${patient.id}`)}
                          >
                            Ver Perfil
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPatientToDelete(patient.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el paciente y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
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

