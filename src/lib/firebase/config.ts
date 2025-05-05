
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, initializeAuth, connectAuthEmulator } from 'firebase/auth'; // Added connectAuthEmulator
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore'; // Import Firestore

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file
const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST; // Use a generic host var
const AUTH_EMULATOR_PORT = 9099; // Default Auth port
const FIRESTORE_EMULATOR_PORT = 8080; // Default Firestore port

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Function to check if all required Firebase config values are present
function hasFirebaseConfig(): boolean {
    // API Key and Project ID are crucial for basic auth and Firestore operations
    return !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.authDomain; // Also check authDomain
}

let firebaseInitializationError: Error | null = null;

// --- Configuration Validation ---
// Log missing variables only once on the client side
if (typeof window !== 'undefined') {
    const requiredVars = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, // Crucial for auth
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Needed for Firestore
    };

    const missingEnvVars = Object.entries(requiredVars)
        .filter(([, value]) => !value)
        .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

    if (missingEnvVars.length > 0) {
         const message = `AVISO: Variáveis de ambiente da configuração do Firebase ausentes ou inválidas: ${missingEnvVars.join(', ')}. Verifique seu arquivo .env ou as configurações do ambiente. Funcionalidades do Firebase podem não operar corretamente.`;
         console.warn(message); // Use warn for missing config
         // Set initialization error only if it hasn't been set by a catch block later
         if (!firebaseInitializationError) {
             firebaseInitializationError = new Error("Variáveis de ambiente da configuração do Firebase ausentes ou inválidas.");
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
            console.log("Tentando inicializar Firebase App...");
            app = initializeApp(firebaseConfig);
            console.log('App Firebase inicializado.');
        } else {
          app = getApp();
          console.log('App Firebase já existe.');
        }
    } else {
        const errorMsg = "Erro Crítico: Inicialização do Firebase App ignorada devido a configuração ausente ou erro prévio.";
        console.error(errorMsg);
        if (!firebaseInitializationError) { // Avoid overwriting specific errors
            firebaseInitializationError = new Error(errorMsg);
        }
    }

    // Initialize Auth only if app was successfully initialized and there's no prior error
    if (app && !firebaseInitializationError) {
        console.log("Tentando inicializar Firebase Auth...");
        // Use initializeAuth for better compatibility with different environments
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence, // Use local persistence
            // errorMap: customErrorMap, // Optional: Add custom error mapping if needed
        });
        console.log('Firebase Auth inicializado.');

        // Connect to Auth Emulator if running locally
        if (EMULATOR_HOST) {
            const authEmulatorUrl = `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;
            console.log(`Tentando conectar ao Emulador de Autenticação: ${authEmulatorUrl}`);
            try {
                connectAuthEmulator(auth, authEmulatorUrl);
                console.log('Conectado ao Emulador de Autenticação.');
            } catch (emulatorError) {
                 console.error(`Erro ao conectar ao Emulador de Autenticação em ${authEmulatorUrl}:`, emulatorError);
                 // Optionally set firebaseInitializationError here if emulator connection is critical for dev
                 // firebaseInitializationError = new Error(`Falha ao conectar ao emulador de Auth: ${emulatorError.message}`);
            }
        }

    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        const authSkipMsg = 'Erro: Inicialização do Firebase Auth ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(authSkipMsg);
        firebaseInitializationError = new Error(authSkipMsg);
    }

     // Initialize Firestore only if app was successfully initialized and there's no prior error
     if (app && !firebaseInitializationError) {
        console.log("Tentando inicializar Firebase Firestore...");
        db = getFirestore(app);
        console.log('Firebase Firestore inicializado.');

         // Connect to Firestore Emulator if running locally
        if (EMULATOR_HOST) {
             console.log(`Tentando conectar ao Emulador do Firestore: host=${EMULATOR_HOST} port=${FIRESTORE_EMULATOR_PORT}`);
            try {
                connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
                console.log('Conectado ao Emulador do Firestore.');
             } catch (emulatorError: any) {
                 console.error(`Erro ao conectar ao Emulador do Firestore em ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}:`, emulatorError);
                 // firebaseInitializationError = new Error(`Falha ao conectar ao emulador do Firestore: ${emulatorError.message}`);
             }
         }

    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        const dbSkipMsg = 'Erro: Inicialização do Firebase Firestore ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(dbSkipMsg);
        firebaseInitializationError = new Error(dbSkipMsg);
    }

} catch (error: any) {
    // This catch block handles errors during initializeApp, initializeAuth or getFirestore
    console.error("Erro CRÍTICO inicializando Firebase ou serviços:", error);

    // Provide a more specific message based on common error codes
    if (error.code === 'auth/invalid-api-key' || error.message?.includes('invalid-api-key') || error.code === 'invalid-api-key') {
         const apiKeyErrorMsg = "Erro Crítico: Chave de API do Firebase inválida detectada durante a inicialização. Verifique o valor de NEXT_PUBLIC_FIREBASE_API_KEY.";
         console.error(apiKeyErrorMsg);
         firebaseInitializationError = new Error(apiKeyErrorMsg);
    } else if (error.code === 'auth/invalid-auth-domain' || error.message?.includes('authDomain')) {
         const authDomainErrorMsg = "Erro Crítico: Auth Domain do Firebase inválido ou ausente. Verifique o valor de NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN.";
         console.error(authDomainErrorMsg);
         firebaseInitializationError = new Error(authDomainErrorMsg);
    } else {
         firebaseInitializationError = new Error(`Falha na inicialização do Firebase: ${error.message || 'Erro desconhecido'}`);
    }

    app = null; // Ensure app is null on error
    auth = null; // Ensure auth is null on error
    db = null; // Ensure db is null on error
}

// Export the initialized instances and the potential error
export { app, auth, db, firebaseInitializationError };
