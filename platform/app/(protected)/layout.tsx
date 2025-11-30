"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DataRefetchProvider } from "@/contexts/DataRefetchContext";
import { Sidebar } from "@/components/layout/Sidebar";

// Role-based access control configuration
const roleAccess: Record<string, string[]> = {
  "/dashboard": ["admin"],
  "/pacientes": ["admin", "doctor"],
  "/paciente": ["admin", "doctor"], // prefix for dynamic routes
  "/citas": ["admin", "doctor"],
  "/mi-perfil": ["paciente"],
  "/mis-citas": ["paciente"],
  "/configuracion": ["admin", "doctor", "paciente"], // accessible to all
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    // Check role-based access
    if (user && pathname) {
      const routeKey = Object.keys(roleAccess).find((key) =>
        pathname.startsWith(key)
      );

      if (routeKey) {
        const allowedRoles = roleAccess[routeKey];
        if (!allowedRoles.includes(user.role)) {
          // Redirect based on user role
          if (user.role === "paciente") {
            router.push("/mi-perfil");
          } else {
            router.push("/dashboard");
          }
        }
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DataRefetchProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar />
        {children}
      </div>
    </DataRefetchProvider>
  );
}

