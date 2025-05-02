// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, initializeAuth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore'; // Keep for future Firestore use
// import { getStorage } from 'firebase/storage'; // Keep for future Storage use

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
    return !!firebaseConfig.apiKey;
}

let firebaseInitializationError: Error | null = null;

// --- Configuration Validation ---
// Log missing variables only once on the client side
if (typeof window !== 'undefined') {
    const missingEnvVars = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

    if (missingEnvVars.length > 0) {
         const message = `AVISO: Variáveis de ambiente da configuração do Firebase ausentes: ${missingEnvVars.join(', ')}. Verifique seu arquivo .env.local. Funcionalidades do Firebase podem não operar corretamente.`;
         console.warn(message); // Use warn for missing config
         // Set initialization error only if it hasn't been set by a catch block later
         if (!firebaseInitializationError) {
             firebaseInitializationError = new Error("Variáveis de ambiente da configuração do Firebase ausentes.");
         }
    } else if (!firebaseConfig.apiKey) {
         // Specifically warn if API key is missing, even if other vars might be present
         const apiKeyMessage = "AVISO CRÍTICO: A variável de ambiente NEXT_PUBLIC_FIREBASE_API_KEY está faltando ou vazia. A autenticação falhará.";
         console.error(apiKeyMessage); // Use ERROR level for critical missing key
         if (!firebaseInitializationError) {
             firebaseInitializationError = new Error("Erro Crítico: Chave de API do Firebase (API Key) ausente.");
         }
    }
}


// --- Initialize Firebase ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
// firebaseInitializationError already declared above

try {
    // Prevent initialization if an error was already detected (e.g., missing API key)
    if (!firebaseInitializationError) {
        if (!getApps().length) {
          // Check if API key is present before initializing
          if (hasFirebaseConfig()) {
            console.log("Tentando inicializar Firebase...");
            app = initializeApp(firebaseConfig); // This line might throw if the key is invalid format, etc.
            console.log('App Firebase inicializado.');
          } else {
             // This handles missing API key primarily
             const errorMsg = "Erro Crítico: Inicialização do Firebase ignorada devido à chave de API ausente.";
             console.error(errorMsg); // Log as error
             firebaseInitializationError = new Error(errorMsg);
          }
        } else {
          app = getApp();
          console.log('App Firebase já existe.');
        }
    } else {
        console.warn("Inicialização do Firebase ignorada devido a erro prévio (variáveis ausentes ou chave API inválida).");
    }


    // Initialize Auth only if app was successfully initialized and there's no prior error
    if (app && !firebaseInitializationError) {
        console.log("Tentando inicializar Firebase Auth...");
        // Use initializeAuth for better compatibility with different environments (client/server)
        // and persistence options.
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence, // Use local persistence
            // Useful for debugging popup/redirect issues:
            // popupRedirectResolver: browserPopupRedirectResolver,
        });
        console.log('Firebase Auth inicializado.');
    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        // Handle the case where app initialization failed or was skipped
        const authSkipMsg = 'Erro: Inicialização do Firebase Auth ignorada porque a inicialização do app falhou ou foi ignorada.';
        console.error(authSkipMsg); // Log as error
        firebaseInitializationError = new Error(authSkipMsg);
    }

} catch (error: any) {
    // This catch block handles errors during initializeApp or initializeAuth
    console.error("Erro CRÍTICO inicializando Firebase ou Auth:", error); // Log the actual error

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
}

// Export the initialized instances and the potential error
export { app, auth, firebaseInitializationError };
// export { db, storage }; // Keep for future use
