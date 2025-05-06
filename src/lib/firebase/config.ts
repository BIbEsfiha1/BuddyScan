// Firebase Initialization Logic
// =============================

// IMPORTANT: This file relies on environment variables.
// Ensure your .env.local file is correctly set up with your Firebase project credentials.
// After updating .env.local, you MUST restart your Next.js development server.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence,
  initializeAuth, // Ensure initializeAuth is imported if needed, though getAuth usually handles it.
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  Timestamp, // Keep Timestamp if used directly elsewhere, otherwise it's mainly for type checking
} from 'firebase/firestore';

// --- Firebase Configuration Object ---
// Temporarily hardcoding Firebase config for debugging environment variable issues.
// WARNING: DO NOT USE HARDCODED KEYS IN PRODUCTION.
// Ensure your .env.local file is correctly set up and Next.js is reading it.
const firebaseConfig = {
  apiKey: "AIzaSyCI3PcqYwR3v4EZVD2EY6tnbqQK94olEOg",
  authDomain: "cannalog-c34fx.firebaseapp.com",
  projectId: "cannalog-c34fx",
  storageBucket: "cannalog-c34fx.firebasestorage.app", // Corrected based on user input
  messagingSenderId: "581752624409",
  appId: "1:581752624409:web:e30cd8231db418dc2a6188" // Corrected based on user input
};

// --- Firebase App Initialization ---
let app: FirebaseApp;
let authInstance: Auth; // Renamed to avoid conflict with 'auth' named export
let dbInstance: Firestore; // Renamed to avoid conflict with 'db' named export
let firebaseInitializationError: Error | null = null; // Initialize error state

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('[DEBUG] Firebase App inicializado/recuperado.');

  // Initialize Auth
  try {
      authInstance = initializeAuth(app, {
          persistence: browserLocalPersistence,
      });
      console.log('[DEBUG] Firebase Auth inicializado com persistência local.');
      console.log('[DEBUG] Firebase Auth initialized. Actual Auth instance config:', authInstance.config);
      if (authInstance.config.authDomain !== firebaseConfig.authDomain) {
          console.error(`[CRITICAL DEBUG] Mismatch detected! Initial config authDomain: "${firebaseConfig.authDomain}", Auth instance authDomain: "${authInstance.config.authDomain}".`);
      }
  } catch (e) {
      console.error('Falha ao inicializar Firebase Auth:', e);
      firebaseInitializationError = new Error(`Erro ao inicializar Auth: ${e instanceof Error ? e.message : String(e)}`);
      // Re-throw or handle as appropriate for your app's error strategy
  }

  // Initialize Firestore
  try {
      dbInstance = getFirestore(app);
      console.log('[DEBUG] Firebase Firestore inicializado.');
  } catch (e) {
      console.error('Falha ao inicializar Firebase Firestore:', e);
      if (!firebaseInitializationError) { // Only set if not already set by auth error
        firebaseInitializationError = new Error(`Erro ao inicializar Firestore: ${e instanceof Error ? e.message : String(e)}`);
      }
  }

  // Connect to Emulators if in development and host is set
  // Note: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST should be used here if reverting to .env.local
  const emulatorHost = "localhost"; // Example for hardcoded check, revert to process.env for .env.local
  const useEmulators = process.env.NODE_ENV === 'development' && emulatorHost;

  if (typeof window !== 'undefined' && useEmulators) {
      console.log(`[DEV] Conectando emuladores Firebase em ${emulatorHost}`);
      try {
          if (authInstance) connectAuthEmulator(authInstance, `http://${emulatorHost}:9099`, { disableWarnings: true });
          console.log('[DEV] Emulador Auth conectado.');
      } catch (e) {
          console.error('[DEV] Falha ao conectar ao emulador Auth:', e);
      }
      try {
          if (dbInstance) connectFirestoreEmulator(dbInstance, emulatorHost, 8080);
          console.log('[DEV] Emulador Firestore conectado.');
      } catch (e) {
          console.error('[DEV] Falha ao conectar ao emulador Firestore:', e);
      }
  }

} catch (initError) {
  console.error('🚨 Erro CRÍTICO na inicialização do Firebase App:', initError);
  firebaseInitializationError = new Error(`Erro CRÍTICO na inicialização do Firebase App: ${initError instanceof Error ? initError.message : String(initError)}`);
  // @ts-ignore
  app = undefined;
  // @ts-ignore
  authInstance = undefined;
  // @ts-ignore
  dbInstance = undefined;
}

// Export the instances with their intended names
const auth = authInstance;
const db = dbInstance;

export { app, auth, db, firebaseInitializationError };
// Export types if needed by other parts of your application
export type { FirebaseApp, Auth, Firestore };
