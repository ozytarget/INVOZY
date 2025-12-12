'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Define the shape of the Firebase context state
export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
}

// Create the React Context with a default undefined value
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Define the props for the provider component
interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [contextValue, setContextValue] = useState<FirebaseContextState | null>(null);

  useEffect(() => {
    // This effect runs once on the client to initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const authInstance = getAuth(app);
    const firestoreInstance = getFirestore(app);

    enableMultiTabIndexedDbPersistence(firestoreInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser.');
      }
    });

    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      // This will be called on initial load and whenever auth state changes.
      setContextValue((currentContext) => {
        // If context is already set, just update user and loading state
        if (currentContext) {
          return { ...currentContext, user, isUserLoading: false };
        }
        // First time setting the context
        return {
          firebaseApp: app,
          auth: authInstance,
          firestore: firestoreInstance,
          user,
          isUserLoading: false,
        };
      });
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // The empty dependency array ensures this effect runs only once.

  // While contextValue is null, Firebase is initializing.
  // We don't render children to prevent them from accessing a null context.
  if (!contextValue) {
    // You can render a global loading spinner here if you want
    return null;
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to access the Firebase context
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseClientProvider.');
  }
  return context;
};

// Custom hooks for specific services, now guaranteed to be non-null
export const useAuth = (): Auth => {
  return useFirebase().auth;
};

export const useFirestore = (): Firestore => {
  return useFirebase().firestore;
};

export const useUser = () => {
  const { user, isUserLoading } = useFirebase();
  return { user, isUserLoading };
};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
