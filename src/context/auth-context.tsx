// src/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
// Import auth instance directly from the new client config
import { auth } from '@/lib/firebase/client';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  authError: Error | null; // Keep authError for listener/runtime errors
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Initialize authError to null, as config errors are handled differently now
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if the auth instance is available (it might not be if client.ts failed)
    if (!auth) {
        const initError = new Error("Serviço de autenticação indisponível. Configuração do Firebase falhou ou está sendo executado no servidor.");
        console.error("Auth Provider:", initError.message);
        setAuthError(initError);
        setLoading(false);
        return;
    }

    console.log("Auth Provider: Setting up Firebase auth state listener...");

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setAuthError(null); // Clear previous listener errors on successful update
      if (currentUser) {
          console.log("Auth Provider: User is logged in - ", currentUser.uid);
      } else {
          console.log("Auth Provider: No user is logged in.");
      }
    }, (error) => {
        console.error("Auth Provider: Error in onAuthStateChanged listener:", error);
        setUser(null);
        setAuthError(error); // Set specific auth listener error
        setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("Auth Provider: Cleaning up Firebase auth state listener.");
        unsubscribe();
    };
  }, []); // Empty dependency array, runs once on mount

  const logout = async () => {
    // Check if auth is available before signing out
    if (!auth) {
        console.error("Logout failed: Auth instance not available.");
        setAuthError(new Error("Serviço de autenticação indisponível para logout."));
        return Promise.reject(authError); // Reject promise if auth is unavailable
    }
    try {
        await signOut(auth);
        // State update will be handled by onAuthStateChanged listener
    } catch (error) {
         console.error("Logout error:", error);
         setAuthError(error instanceof Error ? error : new Error("Falha ao sair."));
         throw error; // Re-throw error for potential handling upstream
    }
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

   // Display error if the auth instance failed to initialize or listener failed
   // This replaces the old firebaseInitializationError check
    if (authError && !user) { // Show critical error if auth failed and no user context yet
        return (
            <div className="flex items-center justify-center min-h-screen bg-destructive/10">
                <Card className="w-full max-w-lg text-center shadow-xl card p-8 border-destructive">
                    <CardHeader>
                        <Loader2 className="h-16 w-16 text-destructive animate-ping mx-auto mb-6" /> {/* Ping animation */}
                        <CardTitle className="text-2xl text-destructive">Erro Crítico de Autenticação</CardTitle>
                        <CardDescription className="text-destructive/80 mt-2">
                            Não foi possível conectar aos serviços de autenticação.
                            <br />
                            {authError.message}
                            <br />
                            Por favor, verifique a configuração ou contate o suporte.
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
