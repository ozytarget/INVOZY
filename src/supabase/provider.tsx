'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './client';

// Define the shape of the Supabase context state
export interface SupabaseContextState {
  user: User | null;
  isUserLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the React Context
export const SupabaseContext = createContext<SupabaseContextState | undefined>(undefined);

// Define the props for the provider component
interface SupabaseClientProviderProps {
  children: ReactNode;
}

export function SupabaseClientProvider({ children }: SupabaseClientProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setIsUserLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      // ✅ Verificar que listener existe ANTES de desusc ribirse
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value: SupabaseContextState = {
    user,
    isUserLoading,
    signIn,
    signUp,
    signOut,
  };

  if (isUserLoading) {
    return null; // You can render a loading spinner here if you want
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Custom hook to access the Supabase context
export const useSupabase = (): SupabaseContextState => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseClientProvider.');
  }
  return context;
};

// Custom hooks for convenience
export const useUser = () => {
  const { user, isUserLoading } = useSupabase();
  return { user, isUserLoading };
};

export const useAuth = () => {
  return useSupabase();
};
