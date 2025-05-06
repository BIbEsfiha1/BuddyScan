// src/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Import only auth
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Auth Provider: Setting up Firebase auth state listener...");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
          console.log("Auth Provider: User is logged in - ", currentUser.uid);
      } else {
          console.log("Auth Provider: No user is logged in.");
      }
    }, (error) => {
        console.error("Auth Provider: Error in onAuthStateChanged listener:", error);
        setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
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
