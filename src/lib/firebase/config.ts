
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'; // Import Firestore

// Your web app's Firebase configuration
// Ensure these environment variables are set in your .env.local file

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
    // API Key is the most crucial for basic auth operations
    // Also check for projectId as it's needed for Firestore
    return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
}

let firebaseInitializationError: Error | null = null;

// --- Configuration Validation ---
// Log missing variables only once on the client side
if (typeof window !== 'undefined') {
    const requiredVars = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Needed for Firestore
      // storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Optional for now
      // messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, // Optional for now
      // appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID, // Optional for now
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
    } else if (!firebaseConfig.apiKey) {
         // Specifically warn if API key is missing, even if other vars might be present
         const apiKeyMessage = "AVISO CRÍTICO: A variável de ambiente NEXT_PUBLIC_FIREBASE_API_KEY está faltando ou vazia. A autenticação falhará.";
         console.error(apiKeyMessage); // Use ERROR level for critical missing key
         if (!firebaseInitializationError) {
             firebaseInitializationError = new Error("Erro Crítico: Chave de API do Firebase (API Key) ausente.");
         }
    } else if (!firebaseConfig.projectId) {
        const projectIdMessage = "AVISO CRÍTICO: A variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID está faltando ou vazia. O Firestore falhará.";
        console.error(projectIdMessage); // Use ERROR level for critical missing key
        if (!firebaseInitializationError) {
             firebaseInitializationError = new Error("Erro Crítico: ID do Projeto Firebase (Project ID) ausente.");
        }
    }
}


// --- Initialize Firebase ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null; // Add Firestore instance variable
// firebaseInitializationError already declared above

try {
    // Prevent initialization if an error was already detected (e.g., missing API key or Project ID)
    if (!firebaseInitializationError) {
        if (!getApps().length) {
          // Check if required config is present before initializing
          if (hasFirebaseConfig()) {
            console.log("Tentando inicializar Firebase App...");
            app = initializeApp(firebaseConfig); // This line might throw if the key is invalid format, etc.
            console.log('App Firebase inicializado.');
          } else {
             // This handles missing API key or Project ID
             const errorMsg = "Erro Crítico: Inicialização do Firebase App ignorada devido a configuração ausente (API Key ou Project ID).";
             console.error(errorMsg); // Log as error
             firebaseInitializationError = new Error(errorMsg);
          }
        } else {
          app = getApp();
          console.log('App Firebase já existe.');
        }
    } else {
        console.warn("Inicialização do Firebase App ignorada devido a erro prévio (variáveis ausentes ou inválidas).");
    }


    // Initialize Auth only if app was successfully initialized and there's no prior error
    // Note: Auth might still work partially without other services, but it's better to gate it
    if (app && !firebaseInitializationError) {
        console.log("Tentando inicializar Firebase Auth...");
        // Use initializeAuth for better compatibility with different environments (client/server)
        // and persistence options.
        // Temporarily disable auth initialization as requested
        // auth = initializeAuth(app, {
        //     persistence: browserLocalPersistence, // Use local persistence
        // });
        // console.log('Firebase Auth inicializado (mas o login pode estar desabilitado).');
        console.log('Firebase Auth inicialização ignorada (desabilitado temporariamente).');
        auth = null; // Ensure auth is null when disabled
    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        // Handle the case where app initialization failed or was skipped
        const authSkipMsg = 'Erro: Inicialização do Firebase Auth ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(authSkipMsg); // Log as error
        firebaseInitializationError = new Error(authSkipMsg);
    }

     // Initialize Firestore only if app was successfully initialized and there's no prior error
     if (app && !firebaseInitializationError) {
        console.log("Tentando inicializar Firebase Firestore...");
        db = getFirestore(app);
        console.log('Firebase Firestore inicializado.');
    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        // Handle the case where app initialization failed or was skipped
        const dbSkipMsg = 'Erro: Inicialização do Firebase Firestore ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(dbSkipMsg); // Log as error
        firebaseInitializationError = new Error(dbSkipMsg);
    }


} catch (error: any) {
    // This catch block handles errors during initializeApp, initializeAuth or getFirestore
    console.error("Erro CRÍTICO inicializando Firebase ou serviços:", error); // Log the actual error

    // Provide a more specific message if the error code indicates an invalid API key during init
    if (error.code === 'auth/invalid-api-key' || error.message?.includes('invalid-api-key') || error.code === 'invalid-api-key') {
         const apiKeyErrorMsg = "Erro Crítico: Chave de API do Firebase inválida detectada durante a inicialização. Verifique o valor de NEXT_PUBLIC_FIREBASE_API_KEY no seu arquivo .env.local.";
         console.error(apiKeyErrorMsg);
         firebaseInitializationError = new Error(apiKeyErrorMsg);
    } else {
        // General initialization error
         firebaseInitializationError = new Error(`Falha na inicialização do Firebase: ${error.message || 'Erro desconhecido'}`);
    }

    app = null; // Ensure app is null on error
    auth = null; // Ensure auth is null on error
    db = null; // Ensure db is null on error
}

// Export the initialized instances and the potential error
// Export db along with app and auth
export { app, auth, db, firebaseInitializationError };
// export { storage }; // Keep for future use
