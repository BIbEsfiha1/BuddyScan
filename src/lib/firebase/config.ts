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

// --- Environment Variable Check ---
// These variables are expected to be defined in .env.local
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

let firebaseInitializationErrorMessage: string | null = null;
let canInitializeFirebase = true;

// This check runs when the module is loaded.
// In Next.js, for client-side components, process.env is populated at build time.
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
    firebaseInitializationErrorMessage = `🚨 Falta configuração crítica do Firebase. Variáveis ausentes: ${missingEnvVars.join(', ')}. Confira seu .env.local`;
    console.error(firebaseInitializationErrorMessage); // Log the error
    canInitializeFirebase = false;
}

// --- Firebase Configuration Object ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Firebase App Initialization ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (canInitializeFirebase) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('[DEBUG] Firebase App inicializado/recuperado.');

    // Initialize Auth
    try {
        // It's generally recommended to use initializeAuth for more explicit control,
        // especially with persistence, though getAuth(app) often suffices.
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence,
            // popupRedirectResolver: browserPopupRedirectResolver, // If needed for popups/redirects
        });
        console.log('[DEBUG] Firebase Auth inicializado com persistência local.');

        // Log the actual config being used by the auth instance for debugging
        console.log('[DEBUG] Firebase Auth initialized. Actual Auth instance config:', auth.config);
        if (auth.config.authDomain !== firebaseConfig.authDomain) {
            console.error(`[CRITICAL DEBUG] Mismatch detected! Initial config authDomain: "${firebaseConfig.authDomain}", Auth instance authDomain: "${auth.config.authDomain}".`);
        }


    } catch (e) {
        console.error('Falha ao inicializar Firebase Auth:', e);
        firebaseInitializationErrorMessage = `Erro ao inicializar Auth: ${e instanceof Error ? e.message : String(e)}`;
        canInitializeFirebase = false; // Prevent further Firebase service usage
        // Re-throw or handle as appropriate for your app's error strategy
    }

    // Initialize Firestore
    try {
        db = getFirestore(app);
        console.log('[DEBUG] Firebase Firestore inicializado.');
    } catch (e) {
        console.error('Falha ao inicializar Firebase Firestore:', e);
        firebaseInitializationErrorMessage = `Erro ao inicializar Firestore: ${e instanceof Error ? e.message : String(e)}`;
        canInitializeFirebase = false; // Prevent further Firebase service usage
    }

    // Connect to Emulators if in development and host is set
    const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
    if (typeof window !== 'undefined' && emulatorHost && canInitializeFirebase) {
        console.log(`[DEV] Conectando emuladores Firebase em ${emulatorHost}`);
        try {
            if (auth) connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
            console.log('[DEV] Emulador Auth conectado.');
        } catch (e) {
            console.error('[DEV] Falha ao conectar ao emulador Auth:', e);
        }
        try {
            if (db) connectFirestoreEmulator(db, emulatorHost, 8080);
            console.log('[DEV] Emulador Firestore conectado.');
        } catch (e) {
            console.error('[DEV] Falha ao conectar ao emulador Firestore:', e);
        }
    }

  } catch (initError) {
    console.error('🚨 Erro CRÍTICO na inicialização do Firebase App:', initError);
    firebaseInitializationErrorMessage = `Erro CRÍTICO na inicialização do Firebase App: ${initError instanceof Error ? initError.message : String(initError)}`;
    canInitializeFirebase = false;
    // Ensure app, auth, db are in a defined state even on failure,
    // though they might not be usable.
    // @ts-ignore - app will not be initialized
    app = undefined;
    // @ts-ignore - auth will not be initialized
    auth = undefined;
    // @ts-ignore - db will not be initialized
    db = undefined;
  }
} else {
    // If cannot initialize, ensure services are undefined
    console.error("Firebase não pode ser inicializado devido a variáveis de ambiente ausentes.");
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
}


// Export a ready-to-use error object or null
// This can be imported by other modules to check Firebase status.
export const firebaseInitializationError = canInitializeFirebase ? null : new Error(firebaseInitializationErrorMessage || "Firebase initialization failed due to unknown reasons.");


export { app, auth, db };
// Export types if needed by other parts of your application
export type { FirebaseApp, Auth, Firestore };
