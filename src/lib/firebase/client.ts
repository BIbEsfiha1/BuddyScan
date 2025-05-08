// src/lib/firebase/client.ts
// Used ONLY in "use client" components

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// --- Firebase Configuration ---
// Reads NEXT_PUBLIC_ variables directly, assuming they are correctly set in .env.local
// and available during the build process for the client bundle.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// --- Client-Side Initialization ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Check if running on the client side before initializing
if (typeof window !== 'undefined') {
    // Initialize (or retrieve) the Firebase App
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // Initialize Auth and Firestore
    auth = getAuth(app);
    // Explicitly set persistence for the client
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error("Firebase Auth: Failed to set persistence", error);
      });

    db = getFirestore(app);

    // NOTE: Emulator connection logic is removed here for simplicity.
    // If needed, it should also be conditional based on environment variables
    // and only run on the client if required for client-side testing.
     const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
     const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;

     if (useEmulators && emulatorHost) {
         console.warn(`[DEV] Connecting Firebase client SDK to emulators on ${emulatorHost}`);
         const { connectAuthEmulator } = await import('firebase/auth');
         const { connectFirestoreEmulator } = await import('firebase/firestore');
         try {
             connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
             console.log('[DEV] Client Auth emulator connected.');
             connectFirestoreEmulator(db, emulatorHost, 8080);
             console.log('[DEV] Client Firestore emulator connected.');
         } catch (e) {
             console.error("[DEV] Error connecting client SDK to Firebase emulators:", e);
         }
     }


} else {
    // Handle server-side case or environment where window is not defined
    // Provide placeholder instances or throw errors if accessed inappropriately
    console.warn("Firebase client SDK initialization skipped on the server.");
    // Assign placeholder/null values or handle as appropriate for your SSR/SSG strategy
    // For now, leave them potentially undefined which might cause errors if accessed server-side
}

// Export the initialized instances for client-side use
export { app, auth, db };
export type { FirebaseApp, Auth, Firestore };

// Export Timestamp separately if needed by client components
export { Timestamp } from 'firebase/firestore';
