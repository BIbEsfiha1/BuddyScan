
// src/lib/firebase/config.ts
// =============================
// Firebase Initialization Logic
// =============================

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  initializeAuth // Added initializeAuth
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  Timestamp
} from 'firebase/firestore';

// --- Environment Variable Check ---
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

let firebaseInitializationError: Error | null = null;
let canInitializeFirebase = true;

if (missingEnvVars.length > 0) {
    const errorMessage = `🚨 Falta configuração crítica do Firebase. Variáveis ausentes: ${missingEnvVars.join(', ')}. Confira seu .env.local`;
    console.error(errorMessage); // Log the error
    // Set the error object to be checked elsewhere
    firebaseInitializationError = new Error(errorMessage);
    canInitializeFirebase = false;
}

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Initialize Firebase Services ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (canInitializeFirebase) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('[FirebaseConfig] Firebase App inicializado/recuperado. Nome:', app.name);
    console.log('[FirebaseConfig] Opções do App (app.options):', JSON.stringify(app.options));

    // Initialize Auth with persistence
    // Use initializeAuth for more robust initialization with persistence options
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      // errorMap: customErrorMap, // Optional: for custom error messages
    });
    console.log('[FirebaseConfig] Firebase Auth inicializado. Configuração atual do Auth (auth.config):', JSON.stringify(auth.config));
    
    // Critical check for authDomain mismatch
    if (auth.config?.authDomain !== firebaseConfig.authDomain) {
        console.error(
            `[CRITICAL DEBUG FirebaseConfig] Mismatch detectado! firebaseConfig.authDomain: "${firebaseConfig.authDomain}", auth.config.authDomain atual: "${auth.config?.authDomain}". Provável causa de auth/argument-error. Verifique "Authorized domains" no Firebase Console e garanta que inclua seu domínio de desenvolvimento (ex: localhost).`
        );
    } else if (!auth.config?.authDomain) {
        console.error(
            `[CRITICAL DEBUG FirebaseConfig] auth.config.authDomain está AUSENTE ou indefinido no objeto "auth" inicializado. firebaseConfig.authDomain era: "${firebaseConfig.authDomain}". Isso causará auth/argument-error.`
        );
    } else {
        console.log('[FirebaseConfig] auth.config.authDomain corresponde a firebaseConfig.authDomain:', auth.config.authDomain);
    }

    db = getFirestore(app);
    console.log('[FirebaseConfig] Firebase Firestore inicializado.');

    // Emulator setup (conditionally based on environment variable)
    const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
    // Ensure emulators are only used in development and on the client-side
    const useEmulators = typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && emulatorHost;

    if (useEmulators) {
      console.log(`[DEV FirebaseConfig] Conectando emuladores Firebase em ${emulatorHost}`);
      try {
        connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
        console.log('[DEV FirebaseConfig] Emulador Auth conectado.');
      } catch (e: any) {
        console.error('[DEV FirebaseConfig] Falha ao conectar ao emulador Auth:', e.message);
        firebaseInitializationError = firebaseInitializationError || new Error(`Falha na conexão com emulador Auth: ${e.message}`);
      }
      try {
        connectFirestoreEmulator(db, emulatorHost, 8080);
        console.log('[DEV FirebaseConfig] Emulador Firestore conectado.');
      } catch (e: any) {
        console.error('[DEV FirebaseConfig] Falha ao conectar ao emulador Firestore:', e.message);
         firebaseInitializationError = firebaseInitializationError || new Error(`Falha na conexão com emulador Firestore: ${e.message}`);
      }
    }
  } catch (initError: any) {
    console.error('🚨 Erro CRÍTICO na inicialização do Firebase:', initError);
    const errorMessage = `Erro CRÍTICO na inicialização do Firebase: ${initError.message || String(initError)}`;
    if (!firebaseInitializationError) { // Only set if not already set by env var check
        firebaseInitializationError = new Error(errorMessage);
    }
    // Ensure app, auth, db are marked as undefined if main init fails to prevent usage
    // @ts-ignore - These are intentionally set to undefined on critical failure
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
  }
} else {
    // This block runs if canInitializeFirebase is false due to missing env vars
    console.error("Firebase não pôde ser inicializado devido à falta de variáveis de ambiente críticas.");
    // firebaseInitializationError is already set by the env var check
    // Ensure app, auth, db are marked as undefined
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
}

// Export the error object, not a message string
export { app, auth, db, firebaseInitializationError };
export type { FirebaseApp, Auth, Firestore };
export { Timestamp };
