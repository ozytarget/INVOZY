'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

type LocalUser = {
  id: string;
  email: string;
};

// Define the shape of the Supabase context state
export interface SupabaseContextState {
  user: LocalUser | null;
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
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
        if (!response.ok) {
          setUser(null);
          return;
        }

        const payload = await response.json();
        setUser(payload.user || null);
      } catch {
        setUser(null);
      } finally {
        setIsUserLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Invalid login credentials');
    }

    setUser(payload.user || null);
  };

  const signUp = async (email: string, password: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'User already registered');
    }

    setUser(payload.user || null);
  };

  const signOut = async () => {
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Logout failed');
    }

    setUser(null);
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
