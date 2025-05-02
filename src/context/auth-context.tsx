// src/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import auth instance and potential error
import { Loader2, AlertTriangle } from 'lucide-react'; // Import Loader and AlertTriangle
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userId: string | null; // Add userId state
  initializationError: Error | null; // Expose initialization error
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // State for userId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(firebaseInitializationError); // Initialize with potential config error

  useEffect(() => {
    // If there was an initialization error, don't try to listen for auth changes
    if (error || !auth) {
      console.warn("Auth listener skipped due to initialization error or null auth object.");
      setLoading(false);
      return;
    }

    // Listen for authentication state changes ONLY if auth is valid
    console.log("Setting up Firebase auth state listener...");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setUserId(currentUser ? currentUser.uid : null); // Set userId when user changes
      setLoading(false);
      setError(null); // Clear any previous listener error
      console.log('Auth state changed:', currentUser?.uid ?? 'No user');
    }, (listenerError) => {
       // Catch errors specifically from the listener
       console.error("Error in onAuthStateChanged listener:", listenerError);
       setError(listenerError);
       setUser(null);
       setUserId(null);
       setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("Cleaning up Firebase auth state listener...");
        unsubscribe();
    }
  // IMPORTANT: Dependency array includes 'auth' and 'error'
  // This ensures the effect re-runs if auth becomes available later OR if error state changes
  }, [auth, error]);

  // Show loading indicator while checking auth state or if there's no error yet
  if (loading && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <span className="sr-only">Carregando autenticação...</span>
      </div>
    );
  }

  // Show error message if Firebase initialization failed
  if (error) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-lg">
                 <AlertTriangle className="h-4 w-4" />
                 <AlertTitle>Erro de Configuração do Firebase</AlertTitle>
                 <AlertDescription>
                   Não foi possível inicializar o Firebase. Verifique as configurações no arquivo `.env.local` e o console do navegador para mais detalhes.
                   <br />
                   <strong className="mt-2 block">Mensagem:</strong> {error.message}
                 </AlertDescription>
            </Alert>
        </div>
     );
  }


  return (
    // Pass the initializationError down through context
    <AuthContext.Provider value={{ user, loading, userId, initializationError: error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
