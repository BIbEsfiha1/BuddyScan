// src/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import error object
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  authError: Error | null; // Add authError to context
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(firebaseInitializationError); // Initialize with firebase init error

  useEffect(() => {
    if (firebaseInitializationError) {
      console.error("Auth Provider: Firebase initialization failed.", firebaseInitializationError);
      setLoading(false);
      // No need to set authError again here, it's initialized with it.
      return; // Stop further auth operations if Firebase didn't initialize
    }

    console.log("Auth Provider: Setting up Firebase auth state listener...");
    // Ensure auth instance is valid before trying to use it
    if (!auth) {
        console.error("Auth Provider: Firebase Auth instance is not available. Cannot set up listener.");
        setAuthError(new Error("Serviço de autenticação indisponível. Configuração do Firebase falhou."));
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setAuthError(null); // Clear error on successful auth state change
      if (currentUser) {
          console.log("Auth Provider: User is logged in - ", currentUser.uid);
      } else {
          console.log("Auth Provider: No user is logged in.");
      }
    }, (error) => {
        console.error("Auth Provider: Error in onAuthStateChanged listener:", error);
        setUser(null);
        setAuthError(error);
        setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("Auth Provider: Cleaning up Firebase auth state listener.");
        unsubscribe();
    };
  }, []); // Run only once on mount

  const logout = async () => {
    if (auth) {
      return signOut(auth);
    }
    console.warn("Logout called but auth instance is null.");
    setAuthError(new Error("Serviço de autenticação indisponível para logout."));
    return Promise.resolve(); // Or reject if preferred for consistency
  };

   // Display loading indicator while auth state is being determined
   if (loading) {
       return (
           <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
              <Card className="w-full max-w-md text-center shadow-lg card p-6">
                  <CardHeader>
                      <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                      <CardTitle>Carregando Autenticação...</CardTitle>
                      <CardDescription>
                         Verificando sua sessão, aguarde um momento.
                      </CardDescription>
                  </CardHeader>
              </Card>
           </div>
       );
   }

   // Display error if Firebase failed to initialize overall
    if (authError && !user) { // Show critical error if firebase failed and no user context yet
        return (
            <div className="flex items-center justify-center min-h-screen bg-destructive/10">
                <Card className="w-full max-w-lg text-center shadow-xl card p-8 border-destructive">
                    <CardHeader>
                        <Loader2 className="h-16 w-16 text-destructive animate-ping mx-auto mb-6" /> {/* Ping animation */}
                        <CardTitle className="text-2xl text-destructive">Erro Crítico de Inicialização</CardTitle>
                        <CardDescription className="text-destructive/80 mt-2">
                            Não foi possível conectar aos serviços de autenticação.
                            <br />
                            {authError.message}
                            <br />
                            Por favor, verifique sua conexão ou contate o suporte.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }


  return (
    <AuthContext.Provider value={{ user, loading, logout, authError }}>
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
