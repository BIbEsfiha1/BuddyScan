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
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        // Storage Bucket, Messaging Sender ID, App ID are often less critical for basic auth
        // Keep checks if needed, but API Key, Auth Domain, Project ID are usually essential
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId
    );
}

let firebaseInitializationError: Error | null = null;

// Log missing variables only once on the client side
if (typeof window !== 'undefined') {
    const missingEnvVars = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

    if (missingEnvVars.length > 0) {
         const message = `Firebase configuration is missing environment variables: ${missingEnvVars.join(', ')}. Please set them in your .env.local file. Firebase features may not work correctly.`;
         console.warn(message); // Use warn for missing config
         // Set initialization error only if it hasn't been set by a catch block later
         if (!firebaseInitializationError) {
             firebaseInitializationError = new Error(message);
         }
    }
}


// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
// firebaseInitializationError already declared above

try {
    if (!getApps().length) {
      // Check if all essential config values are present before initializing
      if (hasFirebaseConfig()) {
        console.log("Attempting Firebase initialization...");
        app = initializeApp(firebaseConfig); // This line might throw if the key is invalid
        console.log('Firebase app initialized.');
      } else {
         // This block handles MISSING variables.
         console.warn('Firebase initialization skipped due to missing environment variables.'); // Use warn
         // Error already set above if on client, this prevents overwriting if it runs server-side first
         if (!firebaseInitializationError) {
            firebaseInitializationError = new Error("Firebase environment variables are missing.");
         }
      }
    } else {
      app = getApp();
      console.log('Firebase app already exists.');
    }

    // Initialize Auth only if app was successfully initialized and there's no prior error
    if (app && !firebaseInitializationError) {
        console.log("Attempting Firebase Auth initialization...");
        // Use initializeAuth for better compatibility with different environments (client/server)
        // and persistence options.
        auth = initializeAuth(app, {
            persistence: browserLocalPersistence, // Use local persistence
            // Useful for debugging popup/redirect issues:
            // popupRedirectResolver: browserPopupRedirectResolver,
        });
        console.log('Firebase Auth initialized.');
    } else if (!firebaseInitializationError) { // Only log if no error exists yet
        // Handle the case where app initialization failed (e.g., missing vars) but wasn't caught
        console.error('Firebase Auth initialization skipped because app initialization failed or was skipped.');
        firebaseInitializationError = new Error("Firebase app initialization failed or was skipped.");
    }

} catch (error: any) {
    // This catch block handles errors during initializeApp or initializeAuth
    console.error("Error initializing Firebase or Auth:", error); // Log the actual error
    // Add specific check for common auth errors
    if (error.code === 'auth/invalid-api-key') {
         console.error("Detailed Error: Invalid Firebase API Key. Please verify the NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file.");
    }
    firebaseInitializationError = error; // Store the actual error caught
    app = null; // Ensure app is null on error
    auth = null; // Ensure auth is null on error
}

// Export the initialized instances and the potential error
export { app, auth, firebaseInitializationError };
// export { db, storage }; // Keep for future use
