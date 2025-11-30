"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
}

export function ContactAgentModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
}: ContactAgentModalProps) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!patientPhone) {
      toast({
        title: 'Sin número de teléfono',
        description: 'Este paciente no tiene un número de teléfono registrado.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const message = `Hola ${patientName}, ¿cómo te encuentras hoy? Me gustaría saber sobre tu estado de salud y cualquier síntoma que puedas estar experimentando.`;
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          phone: patientPhone,
          message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Checkeo iniciado',
          description: 'El agente contactará al paciente para realizar el checkeo diario.',
        });
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'No se pudo contactar al agente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[ContactAgentModal] Error:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al contactar al agente.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageCircle className="h-6 w-6 text-primary" />
            Checkeo Diario - Contactar Paciente
          </DialogTitle>
        </DialogHeader>
        
        <div className="pt-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Está a punto de activar al agente de IA para realizar un checkeo diario del paciente <span className="font-semibold text-foreground">{patientName}</span> vía WhatsApp.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">¿Qué hará el agente?</p>
                <ul className="text-sm space-y-1 mt-1 text-muted-foreground">
                  <li>• Contactará al paciente por WhatsApp</li>
                  <li>• Preguntará sobre su estado de salud actual</li>
                  <li>• Consultará sobre síntomas y molestias</li>
                  <li>• Evaluará su evolución clínica</li>
                  <li>• Registrará la información para seguimiento</li>
                </ul>
              </div>
            </div>
          </div>
          {!patientPhone && (
            <p className="text-destructive text-sm mt-2">
              ⚠️ Este paciente no tiene un número de teléfono registrado.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={sending || !patientPhone}
            className="gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Contactando...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Iniciar Checkeo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

