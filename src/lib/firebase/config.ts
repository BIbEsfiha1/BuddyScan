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
// Hardcoded Firebase config - THIS IS NOT RECOMMENDED FOR PRODUCTION.
// Environment variables should be used.
const firebaseConfig = {
  apiKey: "AIzaSyCI3PcqYwR3v4EZVD2EY6tnbqQK94olEOg",
  authDomain: "cannalog-c34fx.firebaseapp.com",
  projectId: "cannalog-c34fx",
  storageBucket: "cannalog-c34fx.firebasestorage.app", // Corrected this line as per previous user input
  messagingSenderId: "581752624409",
  appId: "1:581752624409:web:e30cd8231db418dc2a6188" // Corrected this line as per previous user input
};

// --- Check for Missing Critical Environment Variables (REMOVED RUNTIME CHECK) ---
// The runtime check for process.env variables is removed as we are hardcoding
// firebaseConfig for now to bypass issues with env var access in certain contexts.
// This means firebaseInitializationError will primarily reflect issues during app/auth/db init.
let firebaseInitializationErrorMessage: string | null = null;
let canInitializeFirebase = true; // Assume true as config is hardcoded

// --- Firebase App Initialization ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let firebaseInitializationError: Error | null = null; // Initialize as null


if (canInitializeFirebase) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      console.log('[DEBUG] Firebase App inicializado/recuperado.');
      console.log('[DEBUG] Firebase Config Used:', firebaseConfig);

      try {
          auth = initializeAuth(app, {
              persistence: browserLocalPersistence,
          });
          console.log('[DEBUG] Firebase Auth inicializado.');
          console.log('[DEBUG] Auth instance config at init:', auth.config);
           if (auth.config.authDomain !== firebaseConfig.authDomain) {
               console.error(`[CRITICAL DEBUG] Mismatch detected! Configured authDomain: "${firebaseConfig.authDomain}", Auth instance authDomain: "${auth.config.authDomain}".`);
           }
      } catch (e) {
          console.error('Falha ao inicializar Firebase Auth:', e);
          firebaseInitializationError = new Error(`Erro ao inicializar Auth: ${e instanceof Error ? e.message : String(e)}`);
          // @ts-ignore - auth might not be assigned
          auth = undefined;
      }

      try {
          db = getFirestore(app);
          console.log('[DEBUG] Firebase Firestore inicializado.');
      } catch (e) {
          console.error('Falha ao inicializar Firebase Firestore:', e);
          if (!firebaseInitializationError) {
            firebaseInitializationError = new Error(`Erro ao inicializar Firestore: ${e instanceof Error ? e.message : String(e)}`);
          }
          // @ts-ignore - db might not be assigned
          db = undefined;
      }

      const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
      const useEmulators = process.env.NODE_ENV === 'development' && emulatorHost;

      if (typeof window !== 'undefined' && useEmulators && auth && db) {
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
    // This block should ideally not be reached if canInitializeFirebase remains true
    // due to hardcoded config. If it is, it means firebaseInitializationErrorMessage was set,
    // which shouldn't happen with the removed runtime env check.
    const criticalErrorMsg = firebaseInitializationErrorMessage || "Firebase não pôde ser inicializado devido à falta de variáveis de ambiente críticas.";
    console.error(criticalErrorMsg);
    firebaseInitializationError = new Error(criticalErrorMsg);
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
}


export { app, auth, db, firebaseInitializationError };
// firebaseInitializationErrorMessage is no longer exported as its logic was removed
export type { FirebaseApp, Auth, Firestore };
export { Timestamp };
    