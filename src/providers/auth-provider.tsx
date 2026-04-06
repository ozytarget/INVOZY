'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

type LocalUser = {
  id: string;
  email: string;
};

export interface AuthContextState {
  user: LocalUser | null;
  isUserLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
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

  const value: AuthContextState = {
    user,
    isUserLoading,
    signIn,
    signUp,
    signOut,
  };

  if (isUserLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = (): AuthContextState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider.');
  }
  return context;
};

export const useUser = () => {
  const { user, isUserLoading } = useAuthContext();
  return { user, isUserLoading };
};

export const useAuth = () => {
  return useAuthContext();
};
