import { Home, Users, Calendar, Settings, User, Stethoscope } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AdminCreateMenu } from './AdminCreateMenu';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/pacientes', icon: Users, label: 'Pacientes' },
        { to: '/doctores', icon: Stethoscope, label: 'Doctores' },
        { to: '/citas', icon: Calendar, label: 'Citas' },
        { to: '/configuracion', icon: Settings, label: 'Configuración' },
      ];
    }
    if (user?.role === 'doctor') {
      return [
        { to: '/pacientes', icon: Users, label: 'Pacientes' },
        { to: '/citas', icon: Calendar, label: 'Citas' },
        { to: '/configuracion', icon: Settings, label: 'Configuración' },
      ];
    }
    return [
      { to: '/mi-perfil', icon: User, label: 'Mi Perfil' },
      { to: '/mis-citas', icon: Calendar, label: 'Mis Citas' },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-2xl font-serif text-primary font-bold">Pausiva</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {user?.role === 'admin' && (
          <div className="mb-4">
            <AdminCreateMenu />
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
            activeClassName="bg-accent text-accent-foreground border-l-3 border-primary"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
};
