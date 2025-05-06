--- a/src/context/auth-context.tsx
+++ b/src/context/auth-context.tsx
@@ -3,7 +3,7 @@
 
 import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 import { onAuthStateChanged, User, signOut } from 'firebase/auth';
-import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import your Firebase auth instance
+import { auth, firebaseInitializationErrorMessage } from '@/lib/firebase/config'; // Import error message string
 import { Loader2 } from 'lucide-react';
 import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 
@@ -21,7 +21,7 @@
 
   useEffect(() => {
      // If Firebase itself failed to initialize, don't attempt to set up listener
-     if (firebaseInitializationError) {
+     if (firebaseInitializationErrorMessage) {
          console.error("Auth Provider: Skipping auth listener due to Firebase initialization error:", firebaseInitializationError);
          setLoading(false);
          setUser(null); // Ensure user is null
@@ -71,7 +71,7 @@
    // Display loading indicator while auth state is being determined
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
               <Card className="w-full max-w-md text-center shadow-lg card p-6">
                   <CardHeader>
@@ -101,5 +101,5 @@
         </div>
     );
    }
-
+   
