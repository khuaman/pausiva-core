"use client";

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Bot, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: string;
  conversationId: string;
  externalId: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentUsed: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

interface Conversation {
  id: string;
  threadId: string;
  patientId: string | null;
  phone: string;
  channel: string;
  status: string;
  actionType: string | null;
  agentUsed: string | null;
  messageCount: number;
  summary: string | null;
  riskLevel: string | null;
  riskScore: number | null;
  startedAt: string;
  endedAt: string | null;
}

interface ConversationData {
  conversation: Conversation;
  messages: Message[];
}

interface ConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
}

export function ConversationModal({
  open,
  onOpenChange,
  conversationId,
}: ConversationModalProps) {
  const [data, setData] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !conversationId) {
      setData(null);
      setError(null);
      return;
    }

    const fetchConversation = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch conversation');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('No se pudo cargar la conversación');
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [open, conversationId]);

  const getRoleIcon = (role: string) => {
    if (role === 'user') {
      return <User className="h-4 w-4" />;
    }
    return <Bot className="h-4 w-4" />;
  };

  const getRoleLabel = (role: string) => {
    if (role === 'user') {
      return 'Usuario';
    }
    if (role === 'assistant') {
      return 'Pau 🌸';
    }
    return 'Sistema';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conversación</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && !loading && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Conversation Header */}
            <div className="pb-4 border-b border-border space-y-2">
              <div className="text-sm text-muted-foreground">
                <p>
                  Iniciada: {format(new Date(data.conversation.startedAt), 'PPp', { locale: es })}
                </p>
                {data.conversation.summary && (
                  <p className="mt-2 text-foreground">
                    <strong>Resumen:</strong> {data.conversation.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {data.messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay mensajes en esta conversación
                </div>
              ) : (
                data.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {getRoleIcon(message.role)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex-1 max-w-[75%] ${
                        message.role === 'user' ? 'items-end' : 'items-start'
                      } flex flex-col`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {getRoleLabel(message.role)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.createdAt), 'p', { locale: es })}
                        </span>
                      </div>

                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-white'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            message.role === 'user' ? 'text-white' : 'text-black'
                          }`}
                        >
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

