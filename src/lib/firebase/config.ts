
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, initializeAuth, connectAuthEmulator } from 'firebase/auth'; // Added connectAuthEmulator
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore'; // Import Firestore

// Your web app's Firebase configuration
// Using the latest config provided by the user.
const firebaseConfig = {
  apiKey: "AIzaSyCI3PcqYwR3v4EZVD2EY6tnbqQK94olEOg", // Updated API Key
  authDomain: "cannalog-c34fx.firebaseapp.com", // Updated Auth Domain
  projectId: "cannalog-c34fx", // Updated Project ID
  storageBucket: "cannalog-c34fx.firebasestorage.app", // Updated Storage Bucket
  messagingSenderId: "581752624409", // Updated Sender ID
  appId: "1:581752624409:web:e30cd8231db418dc2a6188" // Updated App ID
};


// --- Emulator Configuration ---
// Use Firestore emulator host var, default ports if not specified
const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
const AUTH_EMULATOR_PORT = 9099; // Default Auth port
const FIRESTORE_EMULATOR_PORT = 8080; // Default Firestore port


// --- Detailed Config Logging ---
// Log the config being used ONCE on the client side for easier debugging
if (typeof window !== 'undefined' && !(window as any).__firebaseConfigLogged) {
  console.log("--- Firebase Configuration Used (config.ts) ---");
  console.log("API Key:", firebaseConfig.apiKey ? 'Present' : 'MISSING!');
  console.log("Auth Domain:", firebaseConfig.authDomain || 'MISSING! (CRITICAL for Social Login)');
  console.log("Project ID:", firebaseConfig.projectId || 'MISSING!');
  console.log("Storage Bucket:", firebaseConfig.storageBucket || 'Optional - Missing');
  console.log("Messaging Sender ID:", firebaseConfig.messagingSenderId || 'Optional - Missing');
  console.log("App ID:", firebaseConfig.appId || 'Optional - Missing');
  console.log("Emulator Host (NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST):", EMULATOR_HOST || 'Not Set (Using Production)');
  console.log("------------------------------------");
  (window as any).__firebaseConfigLogged = true; // Prevent repeated logging
}


// Function to check if all required Firebase config values are present
function hasFirebaseConfig(): boolean {
    // API Key, Project ID, and Auth Domain are CRITICAL for basic auth and social login flows
    return !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.authDomain;
}

// --- Global Error State ---
let firebaseInitializationError: Error | null = null;

// --- Configuration Validation ---
// Log missing variables only once on the client side
if (typeof window !== 'undefined') {
    const requiredVars = {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain, // MUST check authDomain
      projectId: firebaseConfig.projectId,
    };

    const missingEnvVars = Object.entries(requiredVars)
        .filter(([, value]) => !value)
        .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

    if (missingEnvVars.length > 0) {
         const message = `AVISO: Variáveis de ambiente CRÍTICAS da configuração do Firebase ausentes ou inválidas: ${missingEnvVars.join(', ')}. Verifique seu arquivo .env ou as configurações do ambiente. Login social e outras funcionalidades podem FALHAR.`;
         console.warn(message); // Use warn for missing config
         // Set initialization error only if it hasn't been set by a catch block later
         if (!firebaseInitializationError) {
             firebaseInitializationError = new Error(`Variáveis de ambiente CRÍTICAS do Firebase ausentes: ${missingEnvVars.join(', ')}`);
         }
    }
}


// --- Initialize Firebase ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null; // Add Firestore instance variable

try {
    // Prevent initialization if an error was already detected (e.g., missing required config)
    if (!firebaseInitializationError && hasFirebaseConfig()) {
        if (!getApps().length) {
            console.log("Attempting to initialize Firebase App with config:", firebaseConfig);
            app = initializeApp(firebaseConfig);
            console.log('Firebase App initialized successfully.');
        } else {
          app = getApp();
          console.log('Firebase App already exists, using existing instance.');
        }
    } else {
        const errorMsg = `Erro Crítico: Inicialização do Firebase App ignorada devido a ${firebaseInitializationError ? 'erro prévio' : 'configuração ausente (apiKey, projectId, ou authDomain)'}. Verifique as variáveis de ambiente.`;
        console.error(errorMsg);
        if (!firebaseInitializationError) { // Avoid overwriting specific errors
            firebaseInitializationError = new Error("Configuração essencial do Firebase ausente (apiKey, projectId, ou authDomain).");
        }
    }

    // Initialize Auth only if app was successfully initialized and there's no prior error
    if (app && !firebaseInitializationError) {
        console.log("Attempting to initialize Firebase Auth with Auth Domain:", app.options.authDomain); // Log intended auth domain
        // Use initializeAuth for better compatibility with different environments
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence, // Use local persistence
            // errorMap: customErrorMap, // Optional: Add custom error mapping if needed
        });
        // Log the Auth Domain actually being used by the auth instance
        console.log('Firebase Auth initialized successfully. Actual Auth instance config:', auth.config);

        // Connect to Auth Emulator if running locally (using the same host as Firestore)
        if (EMULATOR_HOST && auth) { // Check if auth is not null before connecting emulator
            // Use the same host as Firestore, but specify the Auth port
            const authEmulatorUrl = `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;
            console.log(`Attempting to connect to Auth Emulator: ${authEmulatorUrl}`);
            try {
                // Ensure connectAuthEmulator is called only once
                if (!(auth as any).__authEmulatorConnected) {
                    connectAuthEmulator(auth, authEmulatorUrl);
                    (auth as any).__authEmulatorConnected = true; // Mark as connected
                    console.log('Connected to Auth Emulator.');
                } else {
                    console.log('Already connected to Auth Emulator.');
                }
            } catch (emulatorError: any) {
                 console.error(`Error connecting to Auth Emulator at ${authEmulatorUrl}:`, emulatorError);
                 // Optionally set firebaseInitializationError here if emulator connection is critical for dev
                 if (!firebaseInitializationError) { // Avoid overwriting specific errors
                    firebaseInitializationError = new Error(`Failed to connect to Auth emulator: ${emulatorError.message}`);
                 }
            }
        }

    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        const authSkipMsg = 'Erro: Inicialização do Firebase Auth ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(authSkipMsg);
        firebaseInitializationError = new Error(authSkipMsg);
    }

     // Initialize Firestore only if app was successfully initialized and there's no prior error
     if (app && !firebaseInitializationError) {
        console.log("Attempting to initialize Firebase Firestore...");
        db = getFirestore(app);
        console.log('Firebase Firestore initialized successfully.');

         // Connect to Firestore Emulator if running locally
        if (EMULATOR_HOST && db) { // Check if db is not null
             console.log(`Attempting to connect to Firestore Emulator: host=${EMULATOR_HOST} port=${FIRESTORE_EMULATOR_PORT}`);
            try {
                // Ensure connectFirestoreEmulator is called only once
                 if (!(db as any).__firestoreEmulatorConnected) {
                    connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
                    (db as any).__firestoreEmulatorConnected = true; // Mark as connected
                    console.log('Connected to Firestore Emulator.');
                 } else {
                    console.log('Already connected to Firestore Emulator.');
                 }
             } catch (emulatorError: any) {
                 console.error(`Error connecting to Firestore Emulator at ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}:`, emulatorError);
                 if (!firebaseInitializationError) {
                    firebaseInitializationError = new Error(`Failed to connect to Firestore emulator: ${emulatorError.message}`);
                 }
             }
         }

    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        const dbSkipMsg = 'Erro: Inicialização do Firebase Firestore ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(dbSkipMsg);
        firebaseInitializationError = new Error(dbSkipMsg);
    }

} catch (error: any) {
    // This catch block handles errors during initializeApp, initializeAuth or getFirestore
    console.error("CRITICAL Firebase initialization error:", error);

    // Provide a more specific message based on common error codes
    if (error.code === 'auth/invalid-api-key' || error.message?.includes('invalid-api-key') || error.code === 'invalid-api-key') {
         const apiKeyErrorMsg = "Erro Crítico: Chave de API do Firebase inválida detectada durante a inicialização. Verifique o valor de NEXT_PUBLIC_FIREBASE_API_KEY.";
         console.error(apiKeyErrorMsg);
         firebaseInitializationError = new Error(apiKeyErrorMsg);
    } else if (error.code === 'auth/invalid-auth-domain' || error.message?.includes('authDomain')) {
         const authDomainErrorMsg = "Erro Crítico: Auth Domain do Firebase inválido ou ausente. Verifique o valor de NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.";
         console.error(authDomainErrorMsg);
         firebaseInitializationError = new Error(authDomainErrorMsg);
    } else if (error.code === 'auth/argument-error' || error.message?.includes('argument-error')) {
         // This might be the case if the entire config object is malformed, but more often related to authDomain for signInWithPopup
         const argErrorMsg = "Erro Crítico: Argumento inválido durante a inicialização do Firebase (possivelmente authDomain ou config inválida). Verifique a configuração no console Firebase e .env.";
         console.error(argErrorMsg);
         firebaseInitializationError = new Error(argErrorMsg);
    } else {
         firebaseInitializationError = new Error(`Falha na inicialização do Firebase: ${error.message || 'Erro desconhecido'}`);
    }

    app = null; // Ensure app is null on error
    auth = null; // Ensure auth is null on error
    db = null; // Ensure db is null on error
}

// Export the initialized instances and the potential error
export { app, auth, db, firebaseInitializationError };
