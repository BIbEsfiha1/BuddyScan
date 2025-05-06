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
// Check for required environment variables *only once* at the top level
const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
];

// Use a flag to indicate if initialization should proceed
let canInitializeFirebase = true;
let firebaseInitializationErrorMessage: string | null = null;

// Perform the check
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
    firebaseInitializationErrorMessage = `🚨 Falta configuração crítica do Firebase. Variáveis ausentes: ${missingEnvVars.join(', ')}. Confira seu .env.local`;
    console.error(firebaseInitializationErrorMessage); // Log the error
    canInitializeFirebase = false;
}

// --- Firebase Configuration Object ---
// Construct config only if initialization is possible
const firebaseConfig = canInitializeFirebase ? {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
} : {}; // Provide an empty object if config is missing to avoid further errors accessing undefined

// --- Firebase Initialization ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
// Store the error object if check failed
let firebaseInitializationError: Error | null = firebaseInitializationErrorMessage ? new Error(firebaseInitializationErrorMessage) : null;

// Only attempt initialization if required env vars were present
if (canInitializeFirebase) {
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
        // Initialize without persistence for server environments (like middleware)
        auth = getAuth(app);
        console.log('Firebase Auth inicializado (sem persistência).');
    }

    // Debug log for authDomain mismatch check - Crucial for social login errors
    if (auth && auth.config?.authDomain !== firebaseConfig.authDomain) {
        console.error(`[CRITICAL DEBUG] Mismatch detectado! Config inicial authDomain: "${firebaseConfig.authDomain}", Instância Auth authDomain: "${auth.config.authDomain}". Verifique as variáveis de ambiente e o processo de build.`);
        // Optionally set the initialization error if this mismatch is critical
        // firebaseInitializationError = new Error("Firebase authDomain mismatch detectado.");
        // auth = null; // Consider nullifying if this is a fatal error
    } else if (auth) {
         console.log(`[DEBUG] authDomain verificado e correto: ${auth.config.authDomain}`);
    } else {
        console.warn("[DEBUG] Instância Auth não está disponível para verificação do authDomain.");
    }


    // Initialize Firestore
    db = getFirestore(app);
    console.log('Firebase Firestore inicializado.');

    // --- Emulator Connection ---
    // Conditionally connect to emulators if NEXT_PUBLIC_USE_FIREBASE_EMULATORS is 'true'
    const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost'; // Default host

    if (useEmulator && typeof window !== 'undefined') { // Connect only in browser for emulators
        console.log(`[DEV] Conectando emuladores Firebase em ${host}`);
        try {
            // Ensure auth and db are not null before connecting emulators
            if (auth && db) {
                const authEmulatorPort = 9099;
                const firestoreEmulatorPort = 8080;
                connectAuthEmulator(auth, `http://${host}:${authEmulatorPort}`, { disableWarnings: true });
                console.log(`Conectado ao emulador Auth em http://${host}:${authEmulatorPort}`);
                connectFirestoreEmulator(db, host, firestoreEmulatorPort);
                console.log(`Conectado ao emulador Firestore em ${host}:${firestoreEmulatorPort}`);
            } else {
                 throw new Error("Instância Auth ou Firestore nula ao tentar conectar emuladores.");
            }
        } catch (emulatorError: any) {
            console.error(`Erro ao conectar aos emuladores Firebase:`, emulatorError);
            // Set initialization error if emulators are critical for dev
            firebaseInitializationError = new Error(`Falha ao conectar aos emuladores: ${emulatorError.message}`);
            auth = null; // Nullify on error
            db = null;
        }
    } else if (process.env.NODE_ENV === 'development') {
         console.log(`[DEV] Emuladores não habilitados (NEXT_PUBLIC_USE_FIREBASE_EMULATORS=${process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS}) ou não está no browser. Conectando ao Firebase de produção/nuvem.`);
    }
    // --- End Emulator Connection ---


  } catch (error: any) {
    console.error('Erro inicializando serviços Firebase:', error);
    // Ensure firebaseInitializationError is set if an error occurs during init
    if (!firebaseInitializationError) { // Only set if not already set by env var check
        firebaseInitializationError = error instanceof Error ? error : new Error(`Inicialização do Firebase falhou: ${error.message}`);
    }
    app = null;
    auth = null;
    db = null;
  }
} else {
  // Log confirms that initialization was skipped due to missing variables
  console.error('Inicialização do Firebase ignorada devido a variáveis de ambiente ausentes.');
}


// --- Exports ---
// Ensure firebaseInitializationError is exported correctly
export {
    app,
    auth,
    db,
    firebaseInitializationError, // Export the error state
    Timestamp, // Re-export Timestamp if needed elsewhere
};
export type { FirebaseApp, Auth, Firestore }; // Export types
