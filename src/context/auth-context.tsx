
// src/context/auth-context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import your Firebase auth instance
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     // If Firebase itself failed to initialize, don't attempt to set up listener
     if (firebaseInitializationError) {
         console.error("Auth Provider: Skipping auth listener due to Firebase initialization error:", firebaseInitializationError);
         setLoading(false);
         setUser(null); // Ensure user is null
         return;
     }
     // If auth object is null (e.g., initialization skipped), also don't set up listener
     if (!auth) {
          console.warn("Auth Provider: Firebase Auth instance is null. Cannot monitor auth state.");
          setLoading(false);
          setUser(null); // Ensure user is null
          return;
     }

    console.log("Auth Provider: Setting up Firebase auth state listener...");
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log("Auth Provider: User is signed in:", currentUser.uid, currentUser.email);
        setUser(currentUser);
        // Store token in cookie (example - consider security implications)
        currentUser.getIdToken().then(token => {
           document.cookie = `firebaseAuthToken=${token}; path=/; max-age=3600`; // 1 hour expiry
        });
      } else {
        console.log("Auth Provider: User is signed out.");
        setUser(null);
         // Clear the auth token cookie on sign out
         document.cookie = 'firebaseAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      setLoading(false);
    }, (error) => {
        // Handle errors during listener setup or state changes
        console.error("Auth Provider: Error in onAuthStateChanged listener:", error);
        setUser(null);
        setLoading(false);
        // Consider showing an error message to the user
    });

    // Cleanup function: unsubscribe the listener when the component unmounts
    return () => {
       console.log("Auth Provider: Cleaning up auth state listener.");
       unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

   const logout = async () => {
       if (!auth) {
           console.error("Logout failed: Auth instance not available.");
           throw new Error("Serviço de autenticação indisponível.");
       }
       try {
           await signOut(auth);
           // User state will be updated by the onAuthStateChanged listener
       } catch (error) {
           console.error("Error signing out: ", error);
           throw error; // Re-throw error to be handled by caller
       }
   };

   // Display loading indicator while auth state is being determined
   if (loading) {
       return (
           <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
              <Card className="w-full max-w-md text-center shadow-lg card p-6">
                  <CardHeader>
                      <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                      <CardTitle>Verificando Autenticação...</CardTitle>
                      <CardDescription>Aguarde um momento.</CardDescription>
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
