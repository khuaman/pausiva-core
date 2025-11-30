"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

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

// Helper to map Supabase user to our User interface
function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  const metadata = supabaseUser.user_metadata || {};
  const role = metadata.role as UserRole || 'paciente';
  
  return {
    id: supabaseUser.id,
    name: metadata.full_name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role,
    avatar: metadata.picture_url || metadata.avatar_url,
  };
}

// Mock user for development bypass
function getMockDevUser(): User | null {
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  if (!bypassAuth) return null;

  const role = (process.env.NEXT_PUBLIC_DEV_USER_ROLE as UserRole) || 'doctor';
  
  return {
    id: 'dev-user-id',
    name: 'Dev User',
    email: 'dev@pausiva.com',
    role,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Development bypass: skip auth if enabled
    const mockUser = getMockDevUser();
    if (mockUser) {
      console.warn('⚠️ AUTH BYPASS ENABLED - Using mock user for development');
      setUser(mockUser);
      setIsLoading(false);
      return;
    }

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const login = async (email: string, password: string) => {
    // Bypass auth in development if enabled
    const mockUser = getMockDevUser();
    if (mockUser) {
      setUser(mockUser);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      setUser(mapSupabaseUser(data.user));
    }
  };

  const logout = async () => {
    // Bypass auth in development if enabled
    if (getMockDevUser()) {
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
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
