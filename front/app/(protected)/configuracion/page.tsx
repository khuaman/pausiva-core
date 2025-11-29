"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Lock, User, Globe } from 'lucide-react';

export default function Configuracion() {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-6">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu cuenta y preferencias
        </p>
      </header>

      {/* Content */}
      <main className="p-8 space-y-12 max-w-4xl">
        {/* Perfil */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Información del Perfil</CardTitle>
            </div>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  Cambiar foto
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG o GIF. Máximo 2MB
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Input id="role" value={user?.role} disabled className="capitalize" />
              </div>
            </div>
            <Button>Guardar cambios</Button>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Seguridad</CardTitle>
            </div>
            <CardDescription>
              Gestiona tu contraseña y configuración de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button>Actualizar contraseña</Button>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>
              Configura cómo quieres recibir notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones por email</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe actualizaciones importantes por correo
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recordatorios de citas</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe recordatorios 24h antes de tus citas
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de seguimiento</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones sobre tu plan de tratamiento
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Novedades de Pausiva</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe información sobre nuevas funcionalidades
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Preferencias</CardTitle>
            </div>
            <CardDescription>
              Personaliza tu experiencia en Pausiva
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="language">Idioma</Label>
              <Input id="language" defaultValue="Español (Perú)" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Zona horaria</Label>
              <Input id="timezone" defaultValue="(GMT-5) Lima, Bogotá" disabled />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

