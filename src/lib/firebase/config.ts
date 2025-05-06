--- a/src/lib/firebase/config.ts
+++ b/src/lib/firebase/config.ts
@@ -2,6 +2,7 @@
 // Firebase Initialization Logic
 // =============================
 
+'use client'; // Ensure this runs client-side for env var check
 import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
 import {
   getAuth,
@@ -14,9 +15,12 @@
   connectFirestoreEmulator,
   Timestamp // Import Timestamp
 } from 'firebase/firestore';
-
 // Helper to capture initialization errors
-export let firebaseInitializationError: Error | null = null;
+// Import or declare firebaseInitializationError and canInitializeFirebase
+// This assumes these are handled appropriately, maybe export them if defined globally?
+// For now, let's declare them locally if they aren't exported elsewhere.
+// export let firebaseInitializationError: Error | null = null; // Assuming this should be exported
+export let firebaseInitializationErrorMessage: string | null = null; // If this is the error message string
 export let canInitializeFirebase = true; // Start assuming we can initialize
 
 // ————— Check Critical ENV Vars —————
@@ -63,8 +67,8 @@
 
 // Initialize services only if configuration is valid
 let app: FirebaseApp | null = null;
-let auth: Auth | null = null;
-let db: Firestore | null = null;
+export let auth: Auth | null = null; // Export auth
+export let db: Firestore | null = null; // Export db
 
 if (!firebaseInitializationError && canInitializeFirebase) { // Check canInitializeFirebase flag
     try {
@@ -98,7 +102,7 @@
         }
     } catch (e: any) {
         firebaseInitializationError = e; // Catch any initialization error
+        firebaseInitializationErrorMessage = `Erro ao inicializar Firebase: ${e.message}`;
         canInitializeFirebase = false;
         console.error('[CRITICAL] Erro na inicialização do Firebase:', e);
         // Optionally, rethrow or handle more gracefully depending on app needs
@@ -114,5 +118,5 @@
 
 // Export initialized services (or null if initialization failed)
 // export { app, auth, db }; // Already exported above conditionally
-// Export types if needed elsewhere
-export type { FirebaseApp, Auth, Firestore, Timestamp };
+export { app }; // Export app
+export type { FirebaseApp, Auth, Firestore, Timestamp }; // Export types
 
