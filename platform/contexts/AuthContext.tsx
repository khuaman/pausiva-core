"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'staff' | 'doctor' | 'paciente';
export type StaffRole = 'admin' | 'support' | 'billing' | 'operations';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  staffRole?: StaffRole; // Only populated if role is 'staff'
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to determine user role by checking staff, doctors, and patients tables
async function resolveUserRole(userId: string, supabase: ReturnType<typeof createClient>): Promise<{ role: UserRole; staffRole?: StaffRole }> {
  // Check if user is staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (staffData) {
    return { 
      role: 'staff',
      staffRole: staffData.role as StaffRole
    };
  }

  // Check if user is a doctor
  const { data: doctorData } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (doctorData) {
    return { role: 'doctor' };
  }

  // Check if user is a patient
  const { data: patientData } = await supabase
    .from('patients')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (patientData) {
    return { role: 'paciente' };
  }

  // Default fallback
  return { role: 'paciente' };
}

// Helper to map Supabase user to our User interface
async function mapSupabaseUser(supabaseUser: SupabaseUser, supabase: ReturnType<typeof createClient>): Promise<User> {
  const metadata = supabaseUser.user_metadata || {};
  
  // Resolve role from database tables
  const { role, staffRole } = await resolveUserRole(supabaseUser.id, supabase);
  
  return {
    id: supabaseUser.id,
    name: metadata.full_name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    role,
    staffRole,
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const mappedUser = await mapSupabaseUser(session.user, supabase);
        setUser(mappedUser);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const mappedUser = await mapSupabaseUser(session.user, supabase);
        setUser(mappedUser);
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
      const mappedUser = await mapSupabaseUser(data.user, supabase);
      setUser(mappedUser);
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
