// src/lib/firebase/config.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  Timestamp,
} from 'firebase/firestore';

// Hardcoded Firebase config based on user's explicit provision
// This is used to ensure the exact configuration user wants is applied during troubleshooting.
const firebaseConfig = {
  apiKey: "AIzaSyCI3PcqYwR3v4EZVD2EY6tnbqQK94olEOg",
  authDomain: "cannalog-c34fx.firebaseapp.com", // CRUCIAL for auth/argument-error
  projectId: "cannalog-c34fx",
  storageBucket: "cannalog-c34fx.firebasestorage.app",
  messagingSenderId: "581752624409",
  appId: "1:581752624409:web:e30cd8231db418dc2a6188"
};

console.log('[DEBUG FirebaseConfig] Using hardcoded firebaseConfig in config.ts:', JSON.stringify(firebaseConfig));

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let firebaseInitializationError: Error | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('[DEBUG FirebaseConfig] Firebase App initialized/retrieved. App Name:', app.name);
  console.log('[DEBUG FirebaseConfig] App options from app.options after initializeApp:', JSON.stringify(app.options));

  // Initialize Auth with persistence
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
  console.log('[DEBUG FirebaseConfig] Firebase Auth initialized. Actual auth.config from "auth" instance:', JSON.stringify(auth.config));
  
  // Critical check for authDomain mismatch
  if (auth.config?.authDomain !== firebaseConfig.authDomain) {
      console.error(
          `[CRITICAL DEBUG FirebaseConfig] Mismatch detected! Hardcoded firebaseConfig.authDomain: "${firebaseConfig.authDomain}", Actual auth.config.authDomain: "${auth.config?.authDomain}". This is a likely cause for auth/argument-error. Check Firebase Console's "Authorized domains" and ensure it includes your development domain (e.g., localhost).`
      );
  } else if (!auth.config?.authDomain) {
      console.error(
          `[CRITICAL DEBUG FirebaseConfig] auth.config.authDomain is MISSING or undefined in the initialized "auth" object. Hardcoded firebaseConfig.authDomain was: "${firebaseConfig.authDomain}". This will cause auth/argument-error.`
      );
  } else {
      console.log('[DEBUG FirebaseConfig] auth.config.authDomain matches firebaseConfig.authDomain:', auth.config.authDomain);
  }

  db = getFirestore(app);
  console.log('[DEBUG FirebaseConfig] Firebase Firestore initialized.');

  // Emulator setup (conditionally based on environment variable)
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
  const useEmulators = typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && emulatorHost;

  if (useEmulators) {
    console.log(`[DEV FirebaseConfig] Conectando emuladores Firebase em ${emulatorHost}`);
    try {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      console.log('[DEV FirebaseConfig] Emulador Auth conectado.');
    } catch (e: any) {
      console.error('[DEV FirebaseConfig] Falha ao conectar ao emulador Auth:', e.message);
      firebaseInitializationError = firebaseInitializationError || new Error(`Emulator Auth connection failed: ${e.message}`);
    }
    try {
      connectFirestoreEmulator(db, emulatorHost, 8080);
      console.log('[DEV FirebaseConfig] Emulador Firestore conectado.');
    } catch (e: any) {
      console.error('[DEV FirebaseConfig] Falha ao conectar ao emulador Firestore:', e.message);
       firebaseInitializationError = firebaseInitializationError || new Error(`Emulator Firestore connection failed: ${e.message}`);
    }
  }
} catch (initError: any) {
  console.error('🚨 Erro CRÍTICO na inicialização do Firebase:', initError);
  const errorMessage = `Erro CRÍTICO na inicialização do Firebase: ${initError.message || String(initError)}`;
  firebaseInitializationError = new Error(errorMessage);
  
  // Ensure app, auth, db are marked as undefined if main init fails
  // @ts-ignore
  app = undefined;
  // @ts-ignore
  auth = undefined;
  // @ts-ignore
  db = undefined;
}

export { app, auth, db, firebaseInitializationError };
export type { FirebaseApp, Auth, Firestore };
export { Timestamp };
