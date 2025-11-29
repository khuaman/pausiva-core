"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'doctor' | 'paciente';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users para demostración
const mockUsers: Record<string, User & { password: string }> = {
  'admin@pausiva.com': {
    id: '1',
    name: 'Admin Pausiva',
    email: 'admin@pausiva.com',
    role: 'admin',
    password: 'admin123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  'doctor@pausiva.com': {
    id: '2',
    name: 'Dra. María González',
    email: 'doctor@pausiva.com',
    role: 'doctor',
    password: 'doctor123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doctor',
  },
  'paciente@pausiva.com': {
    id: '3',
    name: 'Carmen López',
    email: 'paciente@pausiva.com',
    role: 'paciente',
    password: 'paciente123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carmen',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('pausiva_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const mockUser = mockUsers[email.toLowerCase()];
    
    if (!mockUser || mockUser.password !== password) {
      throw new Error('Credenciales inválidas');
    }

    const { password: _, ...userWithoutPassword } = mockUser;
    setUser(userWithoutPassword);
    localStorage.setItem('pausiva_user', JSON.stringify(userWithoutPassword));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pausiva_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
