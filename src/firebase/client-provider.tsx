'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Define the shape of the Firebase context state
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
}

// Create the React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Define the props for the provider component
interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase only on the client side
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const authInstance = getAuth(app);
    const firestoreInstance = getFirestore(app);

    enableMultiTabIndexedDbPersistence(firestoreInstance).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open.');
      } else if (err.code == 'unimplemented') {
        console.warn('Firestore persistence not available in this browser.');
      }
    });

    setFirebaseApp(app);
    setAuth(authInstance);
    setFirestore(firestoreInstance);

    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setUser(user);
      setIsUserLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const contextValue = useMemo((): FirebaseContextState => {
    return {
      firebaseApp,
      auth,
      firestore,
      user,
      isUserLoading,
    };
  }, [firebaseApp, auth, firestore, user, isUserLoading]);

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

// Custom hooks for specific services
export const useAuth = (): Auth => {
    const { auth } = useFirebase();
    if (!auth) {
        throw new Error('Firebase Auth not available. Check FirebaseClientProvider.');
    }
    return auth;
};

export const useFirestore = (): Firestore => {
    const { firestore } = useFirebase();
    if (!firestore) {
        throw new Error('Firestore not available. Check FirebaseClientProvider.');
    }
    return firestore;
};

export const useUser = () => {
    const { user, isUserLoading } = useFirebase();
    return { user, isUserLoading };
};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (T & {__memo?: boolean}) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as T & {__memo?: boolean}).__memo = true;
  
  return memoized;
}
