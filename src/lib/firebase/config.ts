
// src/lib/firebase/config.ts

import { initializeApp, getApps, getApp, FirebaseApp, FirebaseError } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, initializeAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator, Timestamp } from 'firebase/firestore'; // Import Firestore and Timestamp

// --- Environment Variable Validation ---
let firebaseInitializationError: FirebaseError | null = null;

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

const missingEnvVars = Object.entries(firebaseConfig).filter(([key, value]) => !value).map(([key]) => key);

if (missingEnvVars.length > 0) {
    const errorMessage = `Firebase configuration is missing environment variables: ${missingEnvVars.join(', ')}. Please set them in your .env.local file.`;
    console.error(errorMessage);
    firebaseInitializationError = new FirebaseError('config/missing-env-vars', errorMessage);
    // Optionally, you could throw the error here to halt execution if Firebase is absolutely critical
    // throw firebaseInitializationError;
}


// --- Firebase Initialization ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (!firebaseInitializationError) {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        console.log('Firebase App initialized successfully.');

        // Initialize Auth
        // Use initializeAuth for persistence settings BEFORE getAuth
        // Check if running in a browser environment before setting persistence
        if (typeof window !== 'undefined') {
             auth = initializeAuth(app, { persistence: browserLocalPersistence });
             console.log('Firebase Auth initialized with browser persistence.');
        } else {
             // Initialize without persistence for server/non-browser environments
             auth = getAuth(app);
             console.log('Firebase Auth initialized (no persistence).');
        }

        // Log the actual config being used by the auth instance
        console.log('[DEBUG] Firebase Auth initialized. Actual Auth instance config:', auth?.config);
        // Add check for authDomain mismatch
        if (auth?.config?.authDomain !== firebaseConfig.authDomain) {
          console.error(`[CRITICAL DEBUG] Mismatch detected! Initial config authDomain: "${firebaseConfig.authDomain}", Auth instance authDomain: "${auth?.config?.authDomain}".`);
        }


        // Initialize Firestore
        db = getFirestore(app);
        console.log('Firebase Firestore initialized.');

    } catch (error: any) {
        console.error('Error initializing Firebase:', error);
        firebaseInitializationError = error instanceof FirebaseError ? error : new FirebaseError('config/initialization-failed', `Firebase initialization failed: ${error.message}`);
        app = null;
        auth = null;
        db = null;
    }
} else {
    console.error('Firebase initialization skipped due to missing environment variables.');
}


// --- Emulator Connection ---
if (app && auth && db && process.env.NODE_ENV === 'development') {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost'; // Default to localhost if not set
    const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

    if (useEmulator) {
        console.log(`[DEV MODE] Connecting Firebase Emulators on host: ${host}`);
        try {
            // Check if already connected to avoid errors (optional but good practice)
            // Note: Firebase SDK >= v9 doesn't expose easy "isConnected" flags for emulators
            // We'll rely on the connect functions handling subsequent calls gracefully or potential errors.

            // Connect Auth Emulator
            connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
            console.log(`Connected to Auth emulator at http://${host}:9099`);

            // Connect Firestore Emulator
            connectFirestoreEmulator(db, host, 8080);
            console.log(`Connected to Firestore emulator at ${host}:8080`);

        } catch (error: any) {
             console.error(`Error connecting to Firebase emulators:`, error);
             // Decide if this should be a fatal error or just a warning
             // For instance, you might set firebaseInitializationError here as well
             // firebaseInitializationError = new FirebaseError('config/emulator-connection-failed', `Failed to connect to emulators: ${error.message}`);
        }
    } else {
        console.log("[DEV MODE] Emulators not configured to run (NEXT_PUBLIC_USE_FIREBASE_EMULATORS is not 'true'). Connecting to production Firebase.");
    }
} else if (process.env.NODE_ENV === 'development') {
     console.warn("[DEV MODE] Firebase app not initialized or emulator connection skipped.");
}


// --- Exports ---
export {
    app,
    auth,
    db,
    firebaseInitializationError, // Ensure firebaseInitializationError is exported
    Timestamp, // Re-export Timestamp if needed elsewhere
};
export type { FirebaseApp, Auth, Firestore }; // Export types
