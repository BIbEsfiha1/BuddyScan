// src/lib/firebase/server.ts
// Used ONLY in server-side code (middleware, Server Components, API routes, etc.)

// DO NOT import 'firebase/auth' or 'firebase/firestore' directly here
// as they might include client-side specific code.
// Use firebase-admin for server-side operations if interacting with Auth/Firestore securely.
// For now, this file only provides a way to get the basic app config if needed server-side,
// but actual server-side Firebase interaction often requires the Admin SDK.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// Import necessary types if needed
import type { AppOptions } from 'firebase/app';

// Read environment variables available on the server
const firebaseConfig: AppOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!, // Use NEXT_PUBLIC_ for consistency or specific server keys
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Function to get the Firebase App instance on the server
// Note: Direct Auth/Firestore client SDK usage is problematic on the server.
// Consider Firebase Admin SDK for server-side tasks.
export const getServerFirebaseApp = (): FirebaseApp => {
  // Basic check for essential config on the server
  if (!firebaseConfig.apiKey) {
    throw new Error("🚨 Variáveis de ambiente Firebase ausentes no servidor!");
  }

  // Initialize (or retrieve) the Firebase App
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
};

// Example: If you were using Firebase Admin SDK (requires different setup)
/*
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
*/
