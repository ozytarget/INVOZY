'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/supabase/client';

type LocalUser = {
  id: string;
  email: string;
};

type StoredUser = {
  id: string;
  email: string;
  password: string;
};

const USERS_STORAGE_KEY = 'appUsers';
const SESSION_STORAGE_KEY = 'appSessionUser';

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
    if (!isSupabaseConfigured) {
      try {
        const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
          const sessionUser = JSON.parse(rawSession) as LocalUser;
          setUser(sessionUser);
        }
      } catch (error) {
        console.error('Error loading local session:', error);
      } finally {
        setIsUserLoading(false);
      }
      return;
    }

    let isMounted = true;

    const initializeSupabaseSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error loading Supabase session:', error.message);
      }

      if (!isMounted) return;

      const sessionUser = data.session?.user;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email || '' } : null);
      setIsUserLoading(false);
    };

    initializeSupabaseSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ? { id: currentUser.id, email: currentUser.email || '' } : null);
      setIsUserLoading(false);
    });

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(error.message || 'Invalid login credentials');
      }

      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const users = rawUsers ? (JSON.parse(rawUsers) as StoredUser[]) : [];
    const existingUser = users.find(storedUser => storedUser.email.toLowerCase() === normalizedEmail);

    if (!existingUser || existingUser.password !== password) {
      throw new Error('Invalid login credentials');
    }

    const sessionUser: LocalUser = { id: existingUser.id, email: existingUser.email };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  };

  const signUp = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(error.message || 'User already registered');
      }

      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const users = rawUsers ? (JSON.parse(rawUsers) as StoredUser[]) : [];
    const alreadyExists = users.some(storedUser => storedUser.email.toLowerCase() === normalizedEmail);

    if (alreadyExists) {
      throw new Error('User already registered');
    }

    const newUser: StoredUser = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
      email: normalizedEmail,
      password,
    };

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([...users, newUser]));

    const sessionUser: LocalUser = { id: newUser.id, email: newUser.email };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message || 'Logout failed');
      }
      setUser(null);
      return;
    }

    localStorage.removeItem(SESSION_STORAGE_KEY);
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
