// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
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
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId
    );
}

// Log missing variables only once on the client side
if (typeof window !== 'undefined' && !hasFirebaseConfig()) {
    const missingVars = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

    if (missingVars.length > 0) {
         console.warn( // Use warn for missing, error for initialization failure
           `Firebase configuration is missing environment variables: ${missingVars.join(
             ', '
           )}. Please set them in your .env.local file. Firebase features may not work correctly.`
         );
    }
}


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

try {
    if (!getApps().length) {
      // Check if all config values are present before initializing
      if (hasFirebaseConfig()) {
        app = initializeApp(firebaseConfig); // This line might throw if the key is invalid
        console.log('Firebase initialized.');
      } else {
         // This block handles MISSING variables, not invalid ones.
         console.error('Firebase initialization skipped due to missing environment variables.');
         // Assign dummy app/auth to prevent runtime errors where they are expected
         // @ts-ignore - Assigning partial config for error case
         app = {} as FirebaseApp;
         // @ts-ignore
         auth = {} as Auth;
         // Optionally throw an error or handle this case gracefully depending on requirements
         // throw new Error("Firebase environment variables are missing.");
      }
    } else {
      app = getApp();
      console.log('Firebase app already exists.');
    }

    // Initialize Auth only if app was successfully initialized
    // Check if 'app' has necessary methods to be considered initialized
    if (app && app.options && app.options.apiKey) {
        auth = getAuth(app);
    } else {
        // Handle the case where app initialization failed (e.g., missing vars)
        console.error('Firebase Auth initialization skipped because app initialization failed or was skipped.');
         // @ts-ignore
        auth = {} as Auth;
    }

} catch (error) {
    // This catch block should catch the auth/api-key-not-valid error if initializeApp throws it
    console.error("Error initializing Firebase:", error); // Log the actual error
     // Assign dummy app/auth in case of unexpected initialization errors
     // @ts-ignore
    app = {} as FirebaseApp;
     // @ts-ignore
    auth = {} as Auth;
}

// const db = getFirestore(app); // Keep for future Firestore use
// const storage = getStorage(app); // Keep for future Storage use

export { app, auth };
// export { db, storage }; // Keep for future use

