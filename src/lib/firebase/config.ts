// Firebase Initialization Logic
// =============================

// IMPORTANT: This file relies on environment variables.
// Ensure your .env.local file is correctly set up with your Firebase project credentials.
// After updating .env.local, you MUST restart your Next.js development server.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  initializeAuth, // Ensure initializeAuth is imported if needed, though getAuth usually handles it.
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  Timestamp, // Keep Timestamp if used directly elsewhere, otherwise it's mainly for type checking
} from 'firebase/firestore';

// --- Firebase Configuration Object ---
// Construct the Firebase config object directly from process.env
// This ensures that the values are taken from the environment at runtime.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Check for Missing Critical Environment Variables ---
let firebaseInitializationErrorMessage: string | null = null;
let canInitializeFirebase = true;

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    firebaseInitializationErrorMessage = `🚨 Falta configuração crítica do Firebase. Variáveis ausentes: ${missingEnvVars.join(', ')}. Confira seu .env.local`;
    console.error(firebaseInitializationErrorMessage); // Log the error
    canInitializeFirebase = false;
}


// --- Firebase App Initialization ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
// Use the error message string directly for firebaseInitializationError
let firebaseInitializationError: Error | null = firebaseInitializationErrorMessage ? new Error(firebaseInitializationErrorMessage) : null;


if (canInitializeFirebase) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      console.log('[DEBUG] Firebase App inicializado/recuperado.');
      console.log('[DEBUG] Firebase Config Used:', firebaseConfig); // Log the config being used

      // Initialize Auth
      try {
          // Use initializeAuth for more control, especially with persistence
          auth = initializeAuth(app, {
              persistence: browserLocalPersistence,
              // popupRedirectResolver: browserPopupRedirectResolver, // If needed for popups/redirects
          });
          // auth = getAuth(app); // Simpler way if default persistence is okay
          console.log('[DEBUG] Firebase Auth inicializado.');
          console.log('[DEBUG] Auth instance config at init:', auth.config);
           if (auth.config.authDomain !== firebaseConfig.authDomain) {
               console.error(`[CRITICAL DEBUG] Mismatch detected! Configured authDomain: "${firebaseConfig.authDomain}", Auth instance authDomain: "${auth.config.authDomain}".`);
               // This often indicates an issue with how env vars are being read or bundled.
           }
      } catch (e) {
          console.error('Falha ao inicializar Firebase Auth:', e);
          firebaseInitializationError = new Error(`Erro ao inicializar Auth: ${e instanceof Error ? e.message : String(e)}`);
          // @ts-ignore - auth might not be assigned
          auth = undefined;
      }

      // Initialize Firestore
      try {
          db = getFirestore(app);
          console.log('[DEBUG] Firebase Firestore inicializado.');
      } catch (e) {
          console.error('Falha ao inicializar Firebase Firestore:', e);
          if (!firebaseInitializationError) { // Only set if not already set by auth error
            firebaseInitializationError = new Error(`Erro ao inicializar Firestore: ${e instanceof Error ? e.message : String(e)}`);
          }
          // @ts-ignore - db might not be assigned
          db = undefined;
      }

      // Connect to Emulators if in development and host is set
      const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
      const useEmulators = process.env.NODE_ENV === 'development' && emulatorHost;

      if (typeof window !== 'undefined' && useEmulators && auth && db) { // Ensure auth and db are defined
          console.log(`[DEV] Conectando emuladores Firebase em ${emulatorHost}`);
          try {
              connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
              console.log('[DEV] Emulador Auth conectado.');
          } catch (e) {
              console.error('[DEV] Falha ao conectar ao emulador Auth:', e);
          }
          try {
              connectFirestoreEmulator(db, emulatorHost, 8080);
              console.log('[DEV] Emulador Firestore conectado.');
          } catch (e) {
              console.error('[DEV] Falha ao conectar ao emulador Firestore:', e);
          }
      } else if (useEmulators && ( !auth || !db)) {
          console.warn("[DEV] Emulators configured but Auth or Firestore instance is not available for connection.");
      }

    } catch (initError) {
      console.error('🚨 Erro CRÍTICO na inicialização do Firebase App:', initError);
      firebaseInitializationError = new Error(`Erro CRÍTICO na inicialização do Firebase App: ${initError instanceof Error ? initError.message : String(initError)}`);
      // @ts-ignore
      app = undefined;
      // @ts-ignore
      auth = undefined;
      // @ts-ignore
      db = undefined;
    }
} else {
    // Handle case where Firebase cannot be initialized due to missing env vars
    console.error("Firebase não pôde ser inicializado devido à falta de variáveis de ambiente críticas.");
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
    // firebaseInitializationError is already set from the check above
}


export { app, auth, db, firebaseInitializationError, firebaseInitializationErrorMessage };
// Export types if needed by other parts of your application
export type { FirebaseApp, Auth, Firestore };
// Explicitly export Timestamp type if it's used elsewhere
export { Timestamp };