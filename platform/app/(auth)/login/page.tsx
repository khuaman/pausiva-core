"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Role-based redirect
      if (user.role === 'paciente') {
        router.push('/mi-perfil');
      } else if (user.role === 'doctor') {
        router.push('/pacientes');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      
      toast.success('Bienvenida a Pausiva');
      
      // Redirect will be handled by the useEffect above once user state updates
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Credenciales inválidas';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pausiva-gradient p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="/logo.png" 
              alt="Pausiva" 
              width={180} 
              height={60}
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-accent rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">Usuarios de prueba:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Doctor: gabriela.montes@example.com / password123</p>
              <p>Doctor: sofia.paredes@example.com / password123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

