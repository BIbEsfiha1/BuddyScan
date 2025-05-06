// Firebase Initialization Logic
// =============================

'use client'; // Ensure this runs client-side for env var check
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  browserLocalPersistence
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  Timestamp
} from 'firebase/firestore';

// ————— Verifica se as ENV críticas estão presentes —————
const {
  NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST
} = process.env;

if (
  !NEXT_PUBLIC_FIREBASE_API_KEY ||
  !NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  !NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  !NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  !NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  !NEXT_PUBLIC_FIREBASE_APP_ID
) {
  throw new Error(
    '🚨 Falta configuração crítica do Firebase. Confira seu .env.local'
  );
}

// ————— Configuração do Firebase —————
const firebaseConfig = {
  apiKey: NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializa (ou recupera) o App
const app: FirebaseApp =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Inicializa Auth e Firestore
let auth: Auth;
try {
   auth = getAuth(app);
} catch (e) {
    console.error('Failed to get Firebase Auth:', e);
    throw e;
}

try {
    auth.setPersistence(browserLocalPersistence);
} catch (e) {
     console.error('Failed to set persistence for Firebase Auth:', e);
     // Possibly degrade gracefully if persistence is not critical
}

let db: Firestore;
try {
    db = getFirestore(app);
} catch (e) {
   console.error('Failed to get Firebase Firestore:', e);
   throw e;
}

// Se estiver dev e tiver definido o host do emulador, conecta
if (typeof window !== 'undefined' && NEXT_PUBLIC_FIREBASE_EMULATOR_HOST) {
  const host = NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
  console.log(`[DEV] Conectando emuladores Firebase em ${host}`);
  try {
        connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
        console.log('Connected to Auth emulator.');
  } catch (e) {
        console.error('Failed to connect to Auth emulator:', e);
  }
  try {
        connectFirestoreEmulator(db, host, 8080);
        console.log('Connected to Firestore emulator.');
  } catch (e) {
        console.error('Failed to connect to Firestore emulator:', e);
  }
}

export { app, auth, db };
export type { FirebaseApp, Auth, Firestore };
