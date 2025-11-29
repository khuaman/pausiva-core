"use client";

import { useParams, useRouter } from 'next/navigation';
import { getPatientById } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MessageCircle, CheckCircle, Clock, AlertCircle, ChevronDown, Edit, Pill, ClipboardList, FileText, MapPin, Video, Building } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

export default function PatientProfile() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const patient = getPatientById(id || '');
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [selectedRoadmapStage, setSelectedRoadmapStage] = useState<string>('virtualConsultation');
  const [editingDemographics, setEditingDemographics] = useState(false);
  const [editingMedicalHistory, setEditingMedicalHistory] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'doctor';

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Paciente no encontrada</h2>
          <Button onClick={() => router.push('/dashboard')}>Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  const roadmapSteps = [
    { key: 'virtualConsultation', label: 'Consulta Virtual', icon: Calendar },
    { key: 'diagnosis', label: 'Diagnóstico & Plan', icon: CheckCircle },
    { key: 'exams', label: 'Exámenes', icon: AlertCircle },
    { key: 'followUp', label: 'Seguimiento', icon: Clock },
  ];

  // Find current stage (last completed stage)
  const getCurrentStage = () => {
    for (let i = roadmapSteps.length - 1; i >= 0; i--) {
      if (patient.roadmap[roadmapSteps[i].key as keyof typeof patient.roadmap]) {
        return roadmapSteps[i].key;
      }
    }
    return 'virtualConsultation';
  };

  const currentStage = getCurrentStage();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baja': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'alta': return 'Alta Prioridad';
      case 'media': return 'Prioridad Media';
      case 'baja': return 'Baja Prioridad';
      default: return priority;
    }
  };

  const getExamStatusColor = (status: string) => {
    switch (status) {
      case 'completado': return 'bg-success text-success-foreground';
      case 'programado': return 'bg-info text-info-foreground';
      case 'recomendado': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getExamStatusLabel = (status: string) => {
    switch (status) {
      case 'completado': return 'Completado';
      case 'programado': return 'Programado';
      case 'recomendado': return 'Recomendado';
      default: return status;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-gradient-to-br from-background via-background to-accent/20 border-b border-border px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-3 sm:mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-border flex-shrink-0">
            <AvatarImage src={patient.avatar} alt={patient.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-2xl">
              {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
              <h1 className="text-3xl font-serif font-bold text-foreground truncate">
                {patient.name}
              </h1>
              <Badge variant={getPriorityColor(patient.priority)} className="w-fit text-xs">
                {getPriorityLabel(patient.priority)}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <span>{patient.age} años</span>
              <span className="hidden sm:inline">•</span>
              <span>Última visita: {format(new Date(patient.lastVisit), "d 'de' MMMM, yyyy", { locale: es })}</span>
            </div>
          </div>
          <Button size="lg" className="w-full sm:w-auto">Agendar Nueva Cita</Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="historia" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-12">
            <TabsTrigger value="historia" className="text-xs sm:text-sm py-2">Historia Clínica</TabsTrigger>
            <TabsTrigger value="comunicaciones" className="text-xs sm:text-sm py-2">Comunicaciones</TabsTrigger>
            <TabsTrigger value="citas" className="text-xs sm:text-sm py-2">Citas</TabsTrigger>
            <TabsTrigger value="roadmap" className="text-xs sm:text-sm py-2">Roadmap</TabsTrigger>
          </TabsList>

          {/* Historia Clínica */}
          <TabsContent value="historia" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-semibold">Información Demográfica</CardTitle>
                {canEdit && (
                  <Dialog open={editingDemographics} onOpenChange={setEditingDemographics}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Editar Información Demográfica</DialogTitle>
                        <DialogDescription>
                          Actualiza la información de contacto del paciente
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input id="phone" defaultValue={patient.demographics.phone} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" defaultValue={patient.demographics.email} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="emergency">Contacto de Emergencia</Label>
                          <Input id="emergency" defaultValue={patient.demographics.emergencyContact} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="address">Dirección</Label>
                          <Textarea id="address" defaultValue={patient.demographics.address} rows={2} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDemographics(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={() => {
                          console.log('Saving demographics');
                          setEditingDemographics(false);
                        }}>
                          Guardar Cambios
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Teléfono</p>
                  <p className="text-sm sm:text-base text-foreground font-medium break-all">{patient.demographics.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="text-sm sm:text-base text-foreground font-medium break-all">{patient.demographics.email}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contacto de Emergencia</p>
                  <p className="text-sm sm:text-base text-foreground font-medium">{patient.demographics.emergencyContact}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dirección</p>
                  <p className="text-sm sm:text-base text-foreground font-medium">{patient.demographics.address}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-semibold">Antecedentes Médicos</CardTitle>
                {canEdit && (
                  <Dialog open={editingMedicalHistory} onOpenChange={setEditingMedicalHistory}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Editar Antecedentes Médicos</DialogTitle>
                        <DialogDescription>
                          Actualiza el historial médico del paciente
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="allergies">Alergias (separadas por coma)</Label>
                          <Input id="allergies" defaultValue={patient.medicalHistory.allergies.join(', ')} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="medications">Medicamentos Actuales</Label>
                          <Textarea 
                            id="medications" 
                            defaultValue={patient.medicalHistory.currentMedications.join('\n')} 
                            rows={4}
                            placeholder="Un medicamento por línea"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="conditions">Condiciones (separadas por coma)</Label>
                          <Input id="conditions" defaultValue={patient.medicalHistory.conditions.join(', ')} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingMedicalHistory(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={() => {
                          console.log('Saving medical history');
                          setEditingMedicalHistory(false);
                        }}>
                          Guardar Cambios
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Alergias</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalHistory.allergies.length > 0 ? (
                      patient.medicalHistory.allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive" className="text-xs px-3 py-1">
                          {allergy}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Ninguna reportada</span>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Medicamentos Actuales</p>
                  <ul className="space-y-2">
                    {patient.medicalHistory.currentMedications.map((med) => (
                      <li key={med} className="flex items-start gap-2">
                        <Pill className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{med}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Condiciones</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalHistory.conditions.map((condition) => (
                      <Badge key={condition} className="bg-accent text-accent-foreground text-xs px-3 py-1">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comunicaciones */}
          <TabsContent value="comunicaciones">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Comunicaciones WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">
                    {patient.whatsappConversations} conversaciones
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Última interacción: {format(new Date(patient.lastInteraction), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                  <Button>Ver Conversaciones</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Citas */}
          <TabsContent value="citas" className="space-y-6">
            {patient.nextAppointment && (
              <Card className="shadow-sm border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Próxima Cita</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4 p-6 bg-background rounded-lg border border-border">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-lg mb-2">
                        {format(new Date(patient.nextAppointment.date), "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {patient.nextAppointment.time} - {patient.nextAppointment.type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          con {patient.nextAppointment.doctor}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Historial de Citas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {patient.appointments.map((apt) => (
                    <Collapsible key={apt.id} className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between p-5 bg-accent/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <p className="font-semibold text-foreground text-base">{apt.type}</p>
                            <Badge className={
                              apt.status === 'completada' ? 'bg-success text-success-foreground' :
                              apt.status === 'pendiente' ? 'bg-warning text-warning-foreground' :
                              'bg-gray-200 text-gray-800'
                            }>
                              {apt.status}
                            </Badge>
                            <Badge variant="outline" className="gap-1.5">
                              {apt.locationType === 'virtual' ? (
                                <>
                                  <Video className="h-3 w-3" />
                                  Virtual
                                </>
                              ) : (
                                <>
                                  <Building className="h-3 w-3" />
                                  Presencial
                                </>
                              )}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(apt.date), "d 'de' MMMM, yyyy", { locale: es })} a las {apt.time}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {apt.location || 'Ubicación no especificada'}
                            </p>
                            <p className="text-sm text-muted-foreground">{apt.doctor}</p>
                            {apt.duration && (
                              <p className="text-sm text-muted-foreground">Duración: {apt.duration}</p>
                            )}
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-4">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="px-5 pb-5 space-y-5 bg-background pt-4">
                          {/* Symptoms */}
                          {apt.symptoms && apt.symptoms.length > 0 && (
                            <div className="bg-accent/20 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">Sintomatología reportada:</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {apt.symptoms.map((symptom, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {symptom}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Diagnosis */}
                          {apt.diagnosis && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">Diagnóstico:</p>
                              </div>
                              <p className="text-sm text-foreground ml-6 font-medium bg-accent/30 p-3 rounded">{apt.diagnosis}</p>
                            </div>
                          )}

                          {/* Notes */}
                          {apt.notes && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">Notas de la consulta:</p>
                                {canEdit && (
                                  <Dialog open={editingAppointment === apt.id} onOpenChange={(open) => {
                                    if (!open) setEditingAppointment(null);
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setEditingAppointment(apt.id);
                                          setEditedNotes({ ...editedNotes, [apt.id]: apt.notes || '' });
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[600px]">
                                      <DialogHeader>
                                        <DialogTitle className="text-xl font-semibold">Editar Notas de la Cita</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="notes">Notas de la consulta</Label>
                                          <Textarea
                                            id="notes"
                                            value={editedNotes[apt.id] || apt.notes || ''}
                                            onChange={(e) => setEditedNotes({ ...editedNotes, [apt.id]: e.target.value })}
                                            rows={8}
                                            className="resize-none"
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setEditingAppointment(null)}>
                                          Cancelar
                                        </Button>
                                        <Button onClick={() => {
                                          console.log('Saving notes:', editedNotes[apt.id]);
                                          setEditingAppointment(null);
                                        }}>
                                          Guardar Cambios
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                              <p className="text-sm text-foreground ml-6 leading-relaxed">{apt.notes}</p>
                            </div>
                          )}

                          {/* Prescriptions */}
                          {apt.prescriptions && apt.prescriptions.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Pill className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">Prescripciones:</p>
                              </div>
                              <ul className="space-y-2 ml-6">
                                {apt.prescriptions.map((prescription, idx) => (
                                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>{prescription}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Next Steps */}
                          {apt.nextSteps && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">Próximos pasos:</p>
                              </div>
                              <p className="text-sm text-foreground ml-6 leading-relaxed">{apt.nextSteps}</p>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roadmap */}
          <TabsContent value="roadmap" className="space-y-4">
            {/* Progress Steps */}
            <Card className="shadow-sm">
              <CardContent className="pt-6 sm:pt-8 pb-4 sm:pb-6 px-2 sm:px-6">
                <div className="relative flex items-center justify-between">
                  {roadmapSteps.map((step, index) => {
                    const isCompleted = patient.roadmap[step.key as keyof typeof patient.roadmap];
                    const isCurrent = step.key === currentStage;
                    const Icon = step.icon;
                    const isClickable = isCompleted;
                    
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1 relative">
                        {/* Connecting line */}
                        {index < roadmapSteps.length - 1 && (
                          <div 
                            className={`absolute h-0.5 sm:h-1 left-1/2 top-5 sm:top-7 -z-10 transition-all ${
                              isCompleted && patient.roadmap[roadmapSteps[index + 1].key as keyof typeof patient.roadmap]
                                ? 'bg-primary'
                                : 'bg-muted'
                            }`} 
                            style={{ width: `calc(100% - 2rem)`, marginLeft: '1rem' }} 
                          />
                        )}
                        
                        {/* Step button */}
                        <button
                          onClick={() => isClickable && setSelectedRoadmapStage(step.key)}
                          disabled={!isClickable}
                          className={`relative w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-all ${
                            isCurrent && isCompleted
                              ? 'bg-primary text-primary-foreground shadow-lg ring-2 sm:ring-4 ring-primary/20 scale-105 sm:scale-110' 
                              : isCompleted
                              ? 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-md cursor-pointer'
                              : 'bg-muted text-muted-foreground'
                          } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          <Icon className={`${isCurrent ? 'h-5 w-5 sm:h-7 sm:w-7' : 'h-4 w-4 sm:h-6 sm:w-6'}`} />
                          {isCurrent && isCompleted && (
                            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-success rounded-full border-2 border-background" />
                          )}
                        </button>
                        
                        {/* Step label */}
                        <p className={`text-[10px] sm:text-xs text-center font-medium px-0.5 sm:px-1 transition-all leading-tight ${
                          isCurrent && isCompleted
                            ? 'text-foreground font-semibold' 
                            : isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Stage Content */}
            {selectedRoadmapStage === 'virtualConsultation' && patient.roadmap.virtualConsultation && (
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-background to-accent/20">
                  <CardTitle className="text-xl font-semibold">Consulta Virtual</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(patient.roadmap.virtualConsultation.date), "d 'de' MMMM, yyyy", { locale: es })} • {patient.roadmap.virtualConsultation.duration}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="bg-accent/50 rounded-lg p-5">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Notas del doctor:</p>
                    <p className="text-foreground leading-relaxed">{patient.roadmap.virtualConsultation.notes}</p>
                  </div>
                  {patient.roadmap.virtualConsultation.recordingLink && (
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Ver grabación de la consulta
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedRoadmapStage === 'diagnosis' && patient.roadmap.diagnosis && (
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-background to-accent/20">
                  <CardTitle className="text-xl font-semibold">Diagnóstico & Plan de Tratamiento</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(patient.roadmap.diagnosis.date), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                    <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Diagnóstico:</p>
                    <p className="text-foreground font-semibold text-lg">{patient.roadmap.diagnosis.diagnosis}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Plan de tratamiento:</p>
                    <p className="text-foreground leading-relaxed bg-accent/30 p-4 rounded-lg">{patient.roadmap.diagnosis.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">Objetivos terapéuticos:</p>
                    <ul className="space-y-3">
                      {patient.roadmap.diagnosis.objectives.map((obj, idx) => (
                        <li key={obj} className="flex items-start gap-3 group">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold mt-0.5 group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </span>
                          <span className="text-foreground pt-1">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedRoadmapStage === 'exams' && patient.roadmap.exams && patient.roadmap.exams.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-background to-accent/20">
                  <CardTitle className="text-xl font-semibold">Exámenes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {patient.roadmap.exams.map((exam) => (
                      <Collapsible key={exam.name} className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between p-5 bg-accent/20">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-foreground text-base">{exam.name}</p>
                              <Badge className={getExamStatusColor(exam.status)}>
                                {getExamStatusLabel(exam.status)}
                              </Badge>
                            </div>
                            {exam.date && (
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(exam.date), "d 'de' MMMM, yyyy", { locale: es })}
                              </p>
                            )}
                          </div>
                          {(exam.results || exam.notes || exam.files) && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        
                        {(exam.results || exam.notes || exam.files) && (
                          <CollapsibleContent>
                            <div className="px-5 pb-5 space-y-4 bg-background pt-4">
                              {exam.results && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Resultados:</p>
                                  <p className="text-sm text-foreground bg-accent/50 rounded-lg p-4">{exam.results}</p>
                                </div>
                              )}
                              {exam.notes && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Notas del examen:</p>
                                  <p className="text-sm text-foreground bg-accent/30 rounded-lg p-4">{exam.notes}</p>
                                </div>
                              )}
                              {exam.files && exam.files.length > 0 && canEdit && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Archivos del examen:</p>
                                  <div className="space-y-2">
                                    {exam.files.map((file, idx) => (
                                      <Button key={idx} variant="outline" size="sm" className="w-full justify-start">
                                        <FileText className="h-4 w-4 mr-2 text-primary" />
                                        {file}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedRoadmapStage === 'followUp' && patient.roadmap.followUp && patient.roadmap.followUp.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-background to-accent/20">
                  <CardTitle className="text-xl font-semibold">Seguimiento</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {patient.roadmap.followUp.map((followUp, index) => (
                      <div key={index} className="p-5 border border-border rounded-lg bg-accent/20 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-semibold text-muted-foreground">
                            {format(new Date(followUp.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <Badge className={
                            followUp.improvement === 'mejora' ? 'bg-success text-success-foreground' :
                            followUp.improvement === 'estable' ? 'bg-info text-info-foreground' :
                            'bg-warning text-warning-foreground'
                          }>
                            {followUp.improvement}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{followUp.notes}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

