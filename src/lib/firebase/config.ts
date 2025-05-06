// src/lib/firebase/config.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  initializeAuth // Need initializeAuth for persistence
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  Timestamp // Keep Timestamp export if needed
} from 'firebase/firestore';

// --- Environment Variable Validation ---
// Check for required environment variables
const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
let firebaseInitializationError: Error | null = null;

if (missingEnvVars.length > 0) {
    const errorMessage = `🚨 Falta configuração crítica do Firebase. Variáveis ausentes: ${missingEnvVars.join(', ')}. Confira seu .env.local`;
    console.error(errorMessage);
    // Set the error object to be checked elsewhere
    firebaseInitializationError = new Error(errorMessage);
}

// --- Firebase Configuration Object ---
// Construct config directly from environment variables
// Use "!" to assert they are defined (checked above)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// --- Firebase Initialization ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (!firebaseInitializationError) {
  try {
    // Initialize (or get) the Firebase App
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('Firebase App inicializado com sucesso.');
    console.log('[DEBUG] Firebase Config Used:', firebaseConfig); // Log the config being used


    // Initialize Auth with persistence (only in browser)
    if (typeof window !== 'undefined') {
        // Use initializeAuth to set persistence *before* getAuth
        auth = initializeAuth(app, { persistence: browserLocalPersistence });
        console.log('Firebase Auth inicializado com persistência local do navegador.');
    } else {
        // Initialize without persistence for server environments
        auth = getAuth(app);
        console.log('Firebase Auth inicializado (sem persistência).');
    }

    // Debug log for authDomain mismatch check
    if (auth && auth.config?.authDomain !== firebaseConfig.authDomain) {
        console.error(`[CRITICAL DEBUG] Discrepância de authDomain detectada! Config Inicial: "${firebaseConfig.authDomain}", Instância Auth: "${auth.config.authDomain}". Verifique as variáveis de ambiente e o build.`);
        // Optionally set the initialization error if this mismatch is critical
        // firebaseInitializationError = new Error("Firebase authDomain mismatch detected.");
        // auth = null; // Consider nullifying if this is a fatal error
    } else if (auth) {
         console.log(`[DEBUG] authDomain verificado: ${auth.config.authDomain}`);
    } else {
        console.warn("[DEBUG] Instância Auth não está disponível para verificação do authDomain.");
    }


    // Initialize Firestore
    db = getFirestore(app);
    console.log('Firebase Firestore inicializado.');

    // Conditionally connect to emulators if enabled and in dev environment
    const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost'; // Default to localhost

    // Connect emulators only if explicitly enabled, in browser, and host is defined
    if (useEmulator && typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST) {
        console.log(`[DEV] Conectando emuladores Firebase em ${host}`);
        try {
            // Default ports unless overridden by specific env vars (not currently set)
            const authEmulatorPort = 9099;
            const firestoreEmulatorPort = 8080;
            // Ensure auth and db are not null before connecting emulators
            if (auth && db) {
                connectAuthEmulator(auth, `http://${host}:${authEmulatorPort}`, { disableWarnings: true });
                console.log(`Conectado ao emulador Auth em http://${host}:${authEmulatorPort}`);
                connectFirestoreEmulator(db, host, firestoreEmulatorPort);
                console.log(`Conectado ao emulador Firestore em ${host}:${firestoreEmulatorPort}`);
            } else {
                 throw new Error("Instância Auth ou Firestore nula ao tentar conectar emuladores.");
            }
        } catch (emulatorError: any) {
            console.error(`Erro ao conectar aos emuladores Firebase:`, emulatorError);
            // You might want to set firebaseInitializationError here too if emulators are critical for dev
            firebaseInitializationError = new Error(`Falha ao conectar aos emuladores: ${emulatorError.message}`);
            auth = null; // Nullify on error
            db = null;
        }
    } else if (process.env.NODE_ENV === 'development') {
         console.log(`[DEV] Emuladores não habilitados (NEXT_PUBLIC_USE_FIREBASE_EMULATORS=${process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS}) ou host não definido (NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=${process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST}). Conectando ao Firebase de produção/nuvem.`);
    }


  } catch (error: any) {
    console.error('Erro inicializando serviços Firebase:', error);
    firebaseInitializationError = error instanceof Error ? error : new Error(`Inicialização do Firebase falhou: ${error.message}`);
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.error('Inicialização do Firebase ignorada devido a variáveis de ambiente ausentes.');
}


// --- Exports ---
export {
    app,
    auth,
    db,
    firebaseInitializationError, // Export the error state
    Timestamp, // Re-export Timestamp if needed elsewhere
};
export type { FirebaseApp, Auth, Firestore }; // Export types
