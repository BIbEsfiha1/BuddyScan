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
```
    </content>
  </change>
  <change>
    <file>src/services/plant-id.ts</file>
    <description>Rewrite plant service functions to use Firestore instead of localStorage.</description>
    <content><![CDATA[
import { db, firebaseInitializationError } from '@/lib/firebase/config'; // Import Firestore db instance
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit as firestoreLimit, // Rename limit to avoid conflict
    Timestamp,
    writeBatch,
} from 'firebase/firestore';

/**
 * Representa os dados associados a uma planta de cannabis.
 */
export interface Plant {
  /**
   * O identificador único da planta (gerado automaticamente, também usado como ID do documento Firestore).
   */
  id: string;
  /**
   * O código QR associado à planta (geralmente igual ao id).
   */
  qrCode: string;
  /**
   * A variedade (strain) da planta de cannabis.
   */
  strain: string;
  /**
   * A data em que a planta nasceu (foi plantada). Armazenado como string ISO 8601.
   */
  birthDate: string; // Store as ISO string in object, convert to Timestamp for Firestore
  /**
   * O ID da sala de cultivo onde a planta está localizada.
   */
  growRoomId: string;
  /**
   * O status atual da planta (ex: Vegetativo, Floração, Secagem).
   */
  status: string;
  /**
   * Timestamp de quando a planta foi criada (opcional, mas útil para ordenação). Armazenado como string ISO 8601.
   */
  createdAt?: string; // Store as ISO string
}

// Define os estágios comuns de crescimento da cannabis
export const CANNABIS_STAGES = [
  'Semente', // Seed
  'Plântula', // Seedling
  'Clone',    // Clone
  'Vegetativo', // Vegetative
  'Pré-floração', // Pre-flowering
  'Floração', // Flowering
  'Colhida', // Harvested
  'Secagem', // Drying
  'Cura', // Curing
  'Finalizada', // Finished (e.g., discarded or completed lifecycle)
];

// --- Firestore Collection Reference ---
const plantsCollectionRef = collection(db!, 'plants'); // Assumes db is initialized successfully

// Helper to check Firestore availability
function ensureDbAvailable() {
  if (firebaseInitializationError) {
    console.error("Firebase initialization failed:", firebaseInitializationError);
    throw new Error(`Firebase não inicializado: ${firebaseInitializationError.message}`);
  }
  if (!db) {
    throw new Error('Instância do Firestore não está disponível. A inicialização pode ter falhado silenciosamente.');
  }
}

// --- Service Functions using Firestore ---

/**
 * Recupera de forma assíncrona as informações da planta com base em um ID/código QR.
 * Reads from Firestore.
 *
 * @param plantId The ID (or QR Code, assuming they are the same) of the plant.
 * @returns Uma promessa que resolve para um objeto Plant se encontrado, caso contrário, null.
 */
export async function getPlantById(plantId: string): Promise<Plant | null> {
  ensureDbAvailable();
  console.log(`Buscando planta com ID: ${plantId} no Firestore.`);
  try {
    const plantDocRef = doc(db!, 'plants', plantId);
    const plantSnap = await getDoc(plantDocRef);

    if (plantSnap.exists()) {
      const data = plantSnap.data();
      console.log(`Planta encontrada:`, data);
      // Convert Timestamps back to ISO strings if needed
      const birthDate = (data.birthDate as Timestamp)?.toDate().toISOString() ?? data.birthDate; // Handle potential direct string storage too
      const createdAt = (data.createdAt as Timestamp)?.toDate().toISOString() ?? data.createdAt;
      return { ...data, id: plantSnap.id, birthDate, createdAt } as Plant;
    } else {
      console.warn(`Nenhuma planta encontrada para o ID: ${plantId}`);
      return null;
    }
  } catch (error) {
    console.error(`Erro ao buscar planta ${plantId} no Firestore:`, error);
    throw new Error(`Falha ao buscar dados da planta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Alias for getPlantByQrCode assuming qrCode === id
export const getPlantByQrCode = getPlantById;


/**
 * Adiciona uma nova planta ao Firestore.
 * O ID e o QR Code são passados como parte do objeto plantData (gerados antes de chamar esta função).
 *
 * @param plantData Os dados da nova planta a ser adicionada, incluindo o ID e QR Code gerados.
 * @returns Uma promessa que resolve quando a planta é adicionada. Rejeita se o ID já existir ou em caso de erro.
 */
export async function addPlant(plantData: Plant): Promise<void> {
  ensureDbAvailable();
  console.log(`Adicionando planta com ID: ${plantData.id} ao Firestore.`);

  try {
    const plantDocRef = doc(db!, 'plants', plantData.id);

    // Optional: Check if document already exists (setDoc overwrites, but good practice to check if needed)
    const docSnap = await getDoc(plantDocRef);
    if (docSnap.exists()) {
      console.error(`Erro: Documento com ID '${plantData.id}' já existe no Firestore.`);
      throw new Error(`O ID da planta '${plantData.id}' já está em uso.`);
    }

    const now = new Date();
    const dataToSave = {
      ...plantData,
      birthDate: Timestamp.fromDate(new Date(plantData.birthDate)), // Convert ISO string to Timestamp
      createdAt: Timestamp.fromDate(now), // Add creation timestamp
    };

    // Remove id from the data object itself, as it's the document ID
    delete (dataToSave as any).id;


    await setDoc(plantDocRef, dataToSave);
    console.log(`Planta '${plantData.strain}' adicionada com sucesso com ID: ${plantData.id}.`);

  } catch (error) {
    console.error(`Erro ao adicionar planta ${plantData.id} ao Firestore:`, error);
     throw new Error(`Falha ao adicionar planta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Updates the status of an existing plant in Firestore.
 *
 * @param plantId The ID of the plant to update.
 * @param newStatus The new status string.
 * @returns A promise that resolves when the plant status is updated. Rejects if the plant ID is not found or on error.
 */
export async function updatePlantStatus(plantId: string, newStatus: string): Promise<void> {
  ensureDbAvailable();
  console.log(`Atualizando status da planta ID: ${plantId} para "${newStatus}" no Firestore.`);

  // Validate if newStatus is one of the allowed stages (optional but good practice)
  if (!CANNABIS_STAGES.includes(newStatus)) {
       console.warn(`Status "${newStatus}" não é um estágio padrão. Salvando mesmo assim.`);
      // Optionally throw an error: throw new Error(`Status inválido: ${newStatus}`);
  }

  try {
    const plantDocRef = doc(db!, 'plants', plantId);
    await updateDoc(plantDocRef, {
      status: newStatus,
      // Optionally update a 'lastUpdated' timestamp here too
      // lastUpdatedAt: Timestamp.now(),
    });
    console.log(`Status da planta (ID: ${plantId}) atualizado para "${newStatus}".`);
  } catch (error) {
    console.error(`Erro ao atualizar status da planta ${plantId} no Firestore:`, error);
    // Check if the error is due to the document not existing
    if ((error as any).code === 'not-found') {
      throw new Error(`Planta com ID '${plantId}' não encontrada para atualização.`);
    }
     throw new Error(`Falha ao atualizar status da planta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}


/**
 * Recupera uma lista de plantas recentes do Firestore.
 * Ordena por data de criação (createdAt).
 *
 * @param count O número máximo de plantas recentes a serem retornadas.
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
export async function getRecentPlants(count: number = 3): Promise<Plant[]> {
  ensureDbAvailable();
  console.log(`Buscando ${count} plantas recentes do Firestore...`);
  try {
    const q = query(plantsCollectionRef, orderBy('createdAt', 'desc'), firestoreLimit(count));
    const querySnapshot = await getDocs(q);

    const plants: Plant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const birthDate = (data.birthDate as Timestamp)?.toDate().toISOString() ?? data.birthDate;
      const createdAt = (data.createdAt as Timestamp)?.toDate().toISOString() ?? data.createdAt;
      plants.push({ ...data, id: doc.id, birthDate, createdAt } as Plant);
    });
    console.log(`Retornadas ${plants.length} plantas recentes.`);
    return plants;
  } catch (error) {
    console.error('Erro ao buscar plantas recentes no Firestore:', error);
    throw new Error(`Falha ao buscar plantas recentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Recupera uma lista de plantas que precisam de atenção do Firestore.
 * A lógica para "atenção" agora precisa ser implementada no Firestore (por exemplo, um campo 'needsAttention' ou consulta por status específicos).
 * ESTA IMPLEMENTAÇÃO É UM EXEMPLO SIMPLES - Ajuste conforme necessário.
 *
 * @param count O número máximo de plantas a serem retornadas.
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
 export async function getAttentionPlants(count: number = 3): Promise<Plant[]> {
    ensureDbAvailable();
    console.log(`Buscando ${count} plantas que precisam de atenção no Firestore...`);
    try {
      // EXEMPLO: Buscar plantas com status específicos que indicam atenção
      // Adapte 'status' e os valores conforme sua lógica de negócio
      const attentionStatuses = ['Problema Detectado', 'Deficiência', 'Doente']; // Status que indicam atenção
      const q = query(
          plantsCollectionRef,
          where('status', 'in', attentionStatuses),
          orderBy('createdAt', 'desc'), // Ou ordene por outro campo relevante
          firestoreLimit(count)
      );
      const querySnapshot = await getDocs(q);

      const plants: Plant[] = [];
      querySnapshot.forEach((doc) => {
          const data = doc.data();
           const birthDate = (data.birthDate as Timestamp)?.toDate().toISOString() ?? data.birthDate;
           const createdAt = (data.createdAt as Timestamp)?.toDate().toISOString() ?? data.createdAt;
          plants.push({ ...data, id: doc.id, birthDate, createdAt } as Plant);
      });
      console.log(`Retornadas ${plants.length} plantas que precisam de atenção.`);
      return plants;
    } catch (error) {
        console.error('Erro ao buscar plantas que precisam de atenção no Firestore:', error);
        throw new Error(`Falha ao buscar plantas com atenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
 }


 /**
  * Recupera todas as plantas do Firestore.
  * Ordena alfabeticamente por nome da variedade (strain).
  * @returns Uma promessa que resolve para um array com todos os objetos Plant.
  */
 export async function getAllPlants(): Promise<Plant[]> {
    ensureDbAvailable();
    console.log('Buscando todas as plantas do Firestore...');
    try {
        // Ordenar por 'strain' pode exigir um índice composto no Firestore se você combinar com outros filtros/ordens.
        // Ordenar por 'createdAt' ou 'birthDate' é geralmente mais eficiente sem índices personalizados.
        const q = query(plantsCollectionRef, orderBy('strain', 'asc')); // Ou orderBy('createdAt', 'desc')
        const querySnapshot = await getDocs(q);

        const plants: Plant[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
             const birthDate = (data.birthDate as Timestamp)?.toDate().toISOString() ?? data.birthDate;
             const createdAt = (data.createdAt as Timestamp)?.toDate().toISOString() ?? data.createdAt;
            plants.push({ ...data, id: doc.id, birthDate, createdAt } as Plant);
        });
        console.log(`Retornadas ${plants.length} plantas.`);
        // Sorting client-side might be needed if Firestore ordering isn't exactly right or possible
        // plants.sort((a, b) => a.strain.localeCompare(b.strain));
        return plants;
    } catch (error) {
        console.error('Erro ao buscar todas as plantas no Firestore:', error);
        throw new Error(`Falha ao buscar todas as plantas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
 }

 // Exemplo de como migrar dados do localStorage para o Firestore (EXECUTAR UMA VEZ)
 export async function migrateLocalStorageToFirestore() {
    if (typeof window === 'undefined') {
        console.log("A migração só pode ser executada no lado do cliente.");
        return;
    }

    ensureDbAvailable();
    console.log("Iniciando migração do localStorage para o Firestore...");

    const localPlants = loadPlantsFromLocalStorage(); // Sua função existente
    const plantEntries = Object.values(localPlants);

    if (plantEntries.length === 0) {
        console.log("Nenhuma planta encontrada no localStorage para migrar.");
        return;
    }

    const batch = writeBatch(db!);
    let writeCount = 0;

    for (const plant of plantEntries) {
        try {
            const plantDocRef = doc(db!, 'plants', plant.id);
            // Verifique se já existe no Firestore para evitar sobrescrever acidentalmente
            const docSnap = await getDoc(plantDocRef);
            if (docSnap.exists()) {
                console.log(`Planta ID ${plant.id} já existe no Firestore. Ignorando.`);
                continue; // Pula esta planta
            }

            const dataToSave = {
                ...plant,
                birthDate: Timestamp.fromDate(new Date(plant.birthDate)),
                createdAt: Timestamp.fromDate(new Date(plant.createdAt || plant.birthDate)), // Use birthDate se createdAt não existir
            };
            delete (dataToSave as any).id; // Não salve o ID dentro do documento

            batch.set(plantDocRef, dataToSave);
            writeCount++;
            console.log(`Preparando planta ID ${plant.id} (${plant.strain}) para o batch.`);

            // Commits em lotes para evitar exceder limites
            if (writeCount % 400 === 0) {
                console.log(`Committing batch de ${writeCount % 400 === 0 ? 400 : writeCount % 400} plantas...`);
                await batch.commit();
                // batch = writeBatch(db); // Inicia um novo batch após commit
                // É mais seguro recriar o batch:
                // batch = writeBatch(db!); // Comentado - recrie o batch antes do próximo loop se necessário
                console.log("Batch commitado com sucesso.");
                 // Reinicia o batch para o próximo lote
                 // batch = writeBatch(db!); // Comentado - Precisa ser recriado antes da próxima adição
                 // Recreate the batch inside the loop before the next addition
                 // If you commit inside the loop, you need a new batch instance.
                 // For simplicity, let's handle the final commit outside the loop.
            }
        } catch (error) {
            console.error(`Erro ao preparar a planta ID ${plant.id} para o batch:`, error);
            // Considere parar a migração ou registrar o erro e continuar
        }
    }

    try {
        if (writeCount > 0) { // Commit final se houver escritas pendentes
             console.log(`Committing batch final de ${writeCount % 400 === 0 ? (plantEntries.length % 400) : writeCount % 400 } plantas...`);
             await batch.commit();
             console.log("Batch final commitado com sucesso.");
             console.log(`Migração concluída. ${writeCount} plantas migradas para o Firestore.`);
             // Opcional: Limpar o localStorage após a migração bem-sucedida
             // localStorage.removeItem(LOCAL_STORAGE_KEY);
             // console.log("Dados do localStorage removidos após migração.");
        } else {
             console.log("Nenhuma nova planta para commitar no batch final.");
        }
    } catch (error) {
        console.error('Erro ao commitar o batch final:', error);
        console.error("A migração pode não ter sido totalmente concluída.");
    }
 }


// --- Helper Function for Loading Plants (used by dashboard components) ---

/**
 * Loads plants from the appropriate source (Firestore).
 * @returns A record of plants or an empty object if none found or error occurs.
 */
async function loadPlants(): Promise<Record<string, Plant>> {
    const plants = await getAllPlants(); // Fetch all plants from Firestore
    const plantRecord: Record<string, Plant> = {};
    plants.forEach(plant => {
        plantRecord[plant.id] = plant;
    });
    return plantRecord;
}

// Expose loadPlants if needed elsewhere, or keep it internal
// export { loadPlants };

// Remove localStorage specific functions or comment them out
// function loadPlantsFromLocalStorage(): Record<string, Plant> { ... }
// function savePlantsToLocalStorage(plants: Record<string, Plant>): void { ... }
const LOCAL_STORAGE_KEY = 'budscanPlants_DISABLED'; // Disable localStorage key

function loadPlantsFromLocalStorage(): Record<string, Plant> {
    console.warn("loadPlantsFromLocalStorage está desabilitado. Usando Firestore.");
    return {};
}

function savePlantsToLocalStorage(plants: Record<string, Plant>): void {
    console.warn("savePlantsToLocalStorage está desabilitado. Usando Firestore.");
}
```
    </content>
  </change>
  <change>
    <file>src/app/page.tsx</file>
    <description>Update dashboard page to fetch plant data from Firestore via the updated service functions.</description>
    <content><![CDATA[
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScanLine, PlusCircle, VideoOff, Loader2, Sprout, AlertTriangle, History, AlertCircle as AlertCircleIcon, Camera } from '@/components/ui/lucide-icons'; // Use centralized icons
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RecentPlants from '@/components/dashboard/recent-plants';
import AttentionPlants from '@/components/dashboard/attention-plants';
import { Separator } from '@/components/ui/separator';
import type { Plant } from '@/services/plant-id'; // Import Plant type
import { getRecentPlants, getAttentionPlants, getPlantById } from '@/services/plant-id'; // Import Firestore fetch functions
import Image from 'next/image'; // Import Image component


// Define states for camera/scanner
type ScannerStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'initializing' | 'scanning' | 'error' | 'stopped';

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any | null>(null); // Using any for BarcodeDetector due to type issues
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false); // Track mount state

  // State for fetched plant data
  const [recentPlants, setRecentPlants] = useState<Plant[]>([]);
  const [attentionPlants, setAttentionPlants] = useState<Plant[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);


  // Track mount state
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);


  // Initialize BarcodeDetector only once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window && !barcodeDetectorRef.current) {
      try {
        // @ts-ignore - Suppress type checking for experimental API
        barcodeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        console.log('BarcodeDetector initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize BarcodeDetector:', error);
        // Don't set state immediately, let user trigger scan first
      }
    } else if (typeof window !== 'undefined' && !('BarcodeDetector' in window)) {
        console.warn('BarcodeDetector API not supported in this browser.');
        // Don't set state immediately
    }
  }, []); // Empty dependency array ensures this runs only once


   // --- Fetch Plant Data Function ---
   const fetchPlants = useCallback(async () => {
     console.log("Fetching plant data from Firestore service...");
     setIsLoadingPlants(true);
     try {
       // Use the Firestore service functions
       const [fetchedRecent, fetchedAttention] = await Promise.all([
         getRecentPlants(3), // Fetch 3 recent plants from Firestore
         getAttentionPlants(3) // Fetch 3 attention plants from Firestore
       ]);
       console.log("Fetched recent plants:", fetchedRecent);
       console.log("Fetched attention plants:", fetchedAttention);
       setRecentPlants(fetchedRecent);
       setAttentionPlants(fetchedAttention);
     } catch (error) {
       console.error('Failed to fetch plant data from Firestore:', error);
       toast({
         variant: 'destructive',
         title: 'Erro ao Carregar Dados',
         description: `Não foi possível buscar os dados das plantas. ${error instanceof Error ? error.message : ''}`,
       });
     } finally {
       setIsLoadingPlants(false);
        console.log("Finished fetching plant data.");
     }
   }, [toast]); // Dependency: toast


   // --- Effect to fetch plant data on mount and when dialog closes ---
   useEffect(() => {
     if (isMounted && !isDialogOpen) { // Fetch only when mounted and dialog is closed
        console.log("Component mounted or dialog closed, fetching plants.");
        fetchPlants();
     } else {
        console.log(`Skipping plant fetch. Mounted: ${isMounted}, Dialog Open: ${isDialogOpen}`);
     }
   }, [isMounted, isDialogOpen, fetchPlants]); // Run on mount and when dialog state changes


    // --- Stop Media Stream ---
   const stopMediaStream = useCallback(() => {
     console.log("Attempting to stop media stream...");
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
       console.log("Media stream stopped.");
     } else {
       console.log("No active media stream to stop.");
     }
     // Ensure video srcObject is cleared even if streamRef was already null
     if (videoRef.current && videoRef.current.srcObject) {
       videoRef.current.srcObject = null;
       console.log("Video source object cleared.");
     }
   }, []); // No dependencies needed

  // --- Stop Scan Interval ---
  const stopScanInterval = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      console.log("Scan interval stopped.");
    }
  }, []); // No dependencies needed


  // Cleanup interval and stream on unmount
   useEffect(() => {
    return () => {
      // Check isMounted on cleanup to avoid running when not needed
      if (isMounted) {
        console.log("Home component unmounting/cleaning up, stopping scan interval and media stream.");
        stopScanInterval();
        stopMediaStream();
      }
    };
   }, [isMounted, stopScanInterval, stopMediaStream]);


  // --- Request Camera Permission & Start Stream ---
  const startCamera = useCallback(async () => {
     console.log("Attempting to start camera...");
     setScannerError(null);
     setScannerStatus('permission-pending'); // Indicate we are asking for permission

    // Ensure necessary APIs are available
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API (getUserMedia) not supported or available.');
        setScannerError('A API da câmera não é suportada neste navegador ou ambiente.');
        setScannerStatus('error');
        return;
    }


    try {
      // Try to get the environment-facing camera first
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      console.log("Camera permission granted (environment facing).");
      streamRef.current = stream;

       if (videoRef.current) {
           // Flip the video horizontally if it's the front-facing camera (common behavior)
           const isFrontFacing = stream.getVideoTracks()[0]?.getSettings()?.facingMode === 'user';
           // Apply transform only if front facing
           videoRef.current.style.transform = isFrontFacing ? 'scaleX(-1)' : 'scaleX(1)';

           videoRef.current.srcObject = stream;
           console.log("Video stream attached.");
           try {
                await videoRef.current.play();
                console.log("Video play initiated.");
                // IMPORTANT: Move status to initializing AFTER play() promise resolves
                // This ensures the video events ('playing', 'canplay') might fire correctly
                setScannerStatus('initializing');
           } catch (playError) {
               console.error("Error trying to play video:", playError);
               setScannerError("Falha ao iniciar o vídeo da câmera.");
               setScannerStatus('error');
               stopMediaStream(); // Clean up stream if play failed
           }
       } else {
           console.warn("Video ref not available when stream was ready.");
           setScannerStatus('error');
           setScannerError('Falha ao configurar a visualização da câmera.');
           stopMediaStream(); // Cleanup stream if attachment failed
       }

    } catch (error) {
       console.warn('Error accessing environment camera, trying default:', error);
        // Fallback to default camera if environment fails
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Camera permission granted (default).");
            streamRef.current = stream;

            if (videoRef.current) {
                // Flip the video horizontally if it's the front-facing camera
                const isFrontFacing = stream.getVideoTracks()[0]?.getSettings()?.facingMode === 'user';
                 videoRef.current.style.transform = isFrontFacing ? 'scaleX(-1)' : 'scaleX(1)';

                videoRef.current.srcObject = stream;
                console.log("Video stream attached (default).");
                 try {
                    await videoRef.current.play();
                    console.log("Video play initiated (default).");
                    setScannerStatus('initializing');
                 } catch (playError) {
                    console.error("Error trying to play default video:", playError);
                    setScannerError("Falha ao iniciar o vídeo da câmera padrão.");
                    setScannerStatus('error');
                    stopMediaStream();
                 }
            } else {
               console.warn("Video ref not available when default stream was ready.");
               setScannerStatus('error');
               setScannerError('Falha ao configurar a visualização da câmera padrão.');
               stopMediaStream();
           }
        } catch (finalError) {
            console.error('Error accessing any camera:', finalError);
            let errorMsg = 'Permissão da câmera negada. Habilite nas configurações do navegador.';
            if (finalError instanceof Error) {
                if (finalError.name === 'NotAllowedError') {
                    errorMsg = 'Permissão da câmera negada pelo usuário.';
                } else if (finalError.name === 'NotFoundError') {
                    errorMsg = 'Nenhuma câmera encontrada ou compatível.';
                } else if (finalError.name === 'NotReadableError' || finalError.name === 'OverconstrainedError') {
                    errorMsg = 'Câmera já em uso ou não pode ser lida.';
                } else {
                    errorMsg = `Erro ao acessar câmera: ${finalError.message}`;
                }
            }
            setScannerError(errorMsg);
            setScannerStatus('permission-denied');
            toast({
                variant: 'destructive',
                title: 'Erro de Câmera',
                description: errorMsg,
            });
            stopMediaStream();
        }
    }
  }, [stopMediaStream, toast]); // Dependencies: cleanup func, toast

  // Define handleOpenChange *before* it's used as a dependency.
  const handleOpenChangeCallbackRef = useRef<(open: boolean) => void>();

   // --- Start Scanning Interval ---
   const startScanning = useCallback(async () => { // Make async to potentially check plant existence
      stopScanInterval(); // Clear any existing interval first
      console.log("Attempting to start scan interval...");

      if (!barcodeDetectorRef.current) {
         console.error("BarcodeDetector not available, cannot start scanning.");
         setScannerStatus('error');
         setScannerError('Leitor de QR code não inicializado ou não suportado.');
         stopMediaStream();
         return;
      }

      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !videoRef.current.srcObject || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA || videoRef.current.videoWidth === 0) {
          console.warn(`Video not ready/playing/attached for scanning. Status: ${scannerStatus}, Ref: ${!!videoRef.current}, Paused: ${videoRef.current?.paused}, Ended: ${videoRef.current?.ended}, SrcObj: ${!!videoRef.current?.srcObject}, ReadyState: ${videoRef.current?.readyState}, Width: ${videoRef.current?.videoWidth}`);
           if (scannerStatus === 'scanning') {
               console.log("Scan attempt failed while status was 'scanning', resetting to 'initializing'.");
               setScannerStatus('initializing');
           }
          return;
      }

     setScannerStatus('scanning');
     console.log("Scanner status set to 'scanning'. Interval starting.");

     scanIntervalRef.current = setInterval(async () => {
         if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !isDialogOpen || scannerStatus !== 'scanning' || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA || videoRef.current.videoWidth === 0) {
             console.log(`Scan interval tick skipped or stopping. Status: ${scannerStatus}, Dialog: ${isDialogOpen}, Video Paused: ${videoRef.current?.paused}, Ready: ${videoRef.current?.readyState}, Width: ${videoRef.current?.videoWidth}`);
             stopScanInterval();
             return;
         }

       try {
          if (!barcodeDetectorRef.current) {
              console.warn("BarcodeDetector became unavailable during scanning interval.");
              stopScanInterval();
              setScannerStatus('error');
              setScannerError('Leitor de QR code falhou durante o escaneamento.');
              return;
          }

          const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);

         if (barcodes.length > 0 && scannerStatus === 'scanning' && isDialogOpen) {
           const qrCodeData = barcodes[0].rawValue;
           console.log('QR Code detectado:', qrCodeData);

           // --- Verification Step ---
           stopScanInterval(); // Stop scanning first
           setScannerStatus('stopped'); // Keep video frame, indicate stopped

           toast({ title: 'QR Code Detectado!', description: `Verificando planta ${qrCodeData}...` });

           try {
             const plantExists = await getPlantById(qrCodeData); // Check Firestore
             if (plantExists) {
                 console.log(`Planta ${qrCodeData} encontrada no Firestore. Redirecionando...`);
                 sessionStorage.setItem('pendingNavigationQr', qrCodeData);
                 if (handleOpenChangeCallbackRef.current) {
                   console.log("Triggering dialog close via handleOpenChange(false) after QR verification.");
                   handleOpenChangeCallbackRef.current(false); // Close dialog and navigate
                 } else {
                    console.error("handleOpenChange callback ref not set when QR code verified!");
                    setIsDialogOpen(false); // Force close as fallback
                 }
             } else {
                 console.warn(`Planta ${qrCodeData} não encontrada no Firestore.`);
                 toast({
                     variant: 'destructive',
                     title: 'Planta Não Encontrada',
                     description: `O QR code ${qrCodeData} foi lido, mas a planta não existe no banco de dados.`,
                 });
                 // Keep dialog open, reset status to allow rescanning or closing
                 setScannerStatus('initializing'); // Go back to initializing to allow rescan attempts
                 startScanning(); // Optionally restart scanning automatically
             }
           } catch (verificationError) {
               console.error(`Erro ao verificar planta ${qrCodeData}:`, verificationError);
               toast({
                   variant: 'destructive',
                   title: 'Erro na Verificação',
                   description: 'Não foi possível verificar a existência da planta. Tente novamente.',
               });
               setScannerStatus('error');
               setScannerError('Erro ao verificar a planta no banco de dados.');
           }

         }
       } catch (error: any) {
         if (error instanceof DOMException && (error.name === 'NotSupportedError' || error.name === 'InvalidStateError' || error.name === 'OperationError')) {
             console.warn('DOMException during barcode detection (likely temporary/benign):', error.message);
         } else {
             console.error('Erro durante a detecção do código de barras:', error);
         }
       }
     }, 500);
     console.log("Scan interval setup complete.");
   }, [stopScanInterval, stopMediaStream, toast, scannerStatus, isDialogOpen, startScanning]); // Added startScanning


  // --- Dialog Open/Close Handlers ---
   const handleDialogClose = useCallback(() => {
        console.log("Dialog closing intent received, performing cleanup...");
        stopScanInterval();
        stopMediaStream(); // Ensure stream is stopped
        setScannerStatus('idle'); // Reset status
        setScannerError(null);
        console.log("Dialog closed, status set to idle.");

        const qrCodeData = sessionStorage.getItem('pendingNavigationQr');
        if (qrCodeData) {
            console.log(`Found pending navigation for QR: ${qrCodeData}`);
            sessionStorage.removeItem('pendingNavigationQr'); // Clean up storage
            router.push(`/plant/${qrCodeData}`);
        } else {
            console.log("No pending navigation found during close.");
        }
   }, [stopMediaStream, stopScanInterval, router]);

   const handleDialogOpen = useCallback(() => {
        console.log(`Dialog opening intent received...`);
        if (typeof window === 'undefined' || !('BarcodeDetector' in window) || !window.BarcodeDetector || !barcodeDetectorRef.current) {
            const errorMsg = typeof window === 'undefined' || !('BarcodeDetector' in window) || !window.BarcodeDetector
                ? 'O escaneamento de QR code não é suportado neste navegador.'
                : 'Não foi possível inicializar o leitor de QR code. Tente recarregar a página.';
            console.error("Prerequisite check failed:", errorMsg);
            toast({
                variant: 'destructive',
                title: 'Erro de Compatibilidade',
                description: errorMsg,
            });
            setIsDialogOpen(false);
            return;
        }

        setScannerError(null);
        setScannerStatus('idle');
        setIsDialogOpen(true);
        startCamera();
        console.log("Dialog state set to open, camera start initiated.");

   }, [startCamera, toast]);

    const handleOpenChange = useCallback((open: boolean) => {
       console.log(`handleOpenChange called with open: ${open}`);
       if (open) {
           handleDialogOpen();
       } else {
           if (isDialogOpen) {
               handleDialogClose();
               setIsDialogOpen(false);
           } else {
                console.log("handleOpenChange(false) called but dialog already closed.");
           }
       }
   }, [handleDialogOpen, handleDialogClose, isDialogOpen]);

   // Assign the stable callback to the ref for use in startScanning
   useEffect(() => {
       handleOpenChangeCallbackRef.current = handleOpenChange;
   }, [handleOpenChange]);


   // --- Effect to manage video events ---
   useEffect(() => {
     const videoElement = videoRef.current;
     if (!videoElement || !isDialogOpen) {
       return;
     }

     console.log("Effect: Attaching video event listeners.");

     const handleCanPlay = () => {
         console.log(`Video 'canplay' event. Status: ${scannerStatus}. ReadyState: ${videoElement.readyState}.`);
         if (scannerStatus === 'initializing' && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA && !scanIntervalRef.current) {
             console.log("Video can play, attempting scan start from 'canplay'.");
             startScanning();
         }
     };

     const handlePlaying = () => {
         console.log(`Video 'playing' event. Status: ${scannerStatus}. Interval Running: ${!!scanIntervalRef.current}`);
         if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current) {
             console.log("Video is playing, attempting scan start from 'playing'.");
             startScanning();
         }
     };

     const handleLoadedMetadata = () => {
        console.log(`Video 'loadedmetadata' event. Dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}. Status: ${scannerStatus}`);
        if ((scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current && !videoElement.paused && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
           console.log("Metadata loaded, attempting scan start from 'loadedmetadata'.");
           startScanning();
        }
     };

     const handleError = (e: Event) => {
         console.error("Video element error event:", e);
         const error = videoElement.error;
         let errorMsg = "Ocorreu um erro com o vídeo da câmera.";
         if(error) {
            errorMsg = `Erro de vídeo: ${error.message} (código ${error.code})`;
         }
         setScannerError(errorMsg);
         setScannerStatus('error');
         stopMediaStream();
         stopScanInterval();
     };

     const handleWaiting = () => {
         console.warn("Video 'waiting' event. Playback stalled (buffering?).");
         if (scannerStatus === 'scanning') {
             console.log("Stopping scan interval due to video waiting.");
             stopScanInterval();
             setScannerStatus('initializing');
         }
     };


     videoElement.addEventListener('canplay', handleCanPlay);
     videoElement.addEventListener('playing', handlePlaying);
     videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
     videoElement.addEventListener('error', handleError);
     videoElement.addEventListener('waiting', handleWaiting);


     // Initial check
     if (!videoElement.paused && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA && (scannerStatus === 'initializing' || scannerStatus === 'scanning') && !scanIntervalRef.current) {
         console.log("Effect: Video already playing on listener attach, attempting scan start.");
         startScanning();
     }


    return () => {
        if (videoElement) {
            console.log("Effect cleanup: Removing video event listeners.");
            videoElement.removeEventListener('canplay', handleCanPlay);
            videoElement.removeEventListener('playing', handlePlaying);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('error', handleError);
            videoElement.removeEventListener('waiting', handleWaiting);
        }
        stopScanInterval();
    };
  }, [isDialogOpen, scannerStatus, startScanning, stopMediaStream, stopScanInterval]);


  // --- Button Click Handlers ---
  const handleScanClick = () => {
    console.log("Scan button clicked.");
    handleOpenChange(true);
  };

  const handleRegister = () => {
    console.log('Navegar para a página de registro...');
     router.push('/register-plant');
  };


  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background to-primary/5 text-foreground">
      {/* Header Section */}
       <header className="mb-8">
         <div className="flex items-center gap-3 mb-2">
             <Image
                 src="/budscan-logo.png"
                 alt="BudScan Logo"
                 width={200}
                 height={57}
                 priority
                 className="h-10 md:h-12 w-auto drop-shadow-sm"
             />
         </div>
         <p className="text-lg text-muted-foreground">Seu painel de controle de cultivo inteligente.</p>
       </header>

      {/* Main Content Area - Grid Layout */}
       <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

          {/* Left Column (Quick Actions & Attention) */}
          <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions Card */}
             <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 card border border-primary/10">
               <CardHeader>
                 <CardTitle className="text-xl font-semibold">Ações Rápidas</CardTitle>
               </CardHeader>
               <CardContent className="flex flex-col gap-3">
                 <Button
                   size="lg"
                   className="w-full text-lg font-semibold button justify-start"
                   onClick={handleRegister}
                   aria-label="Cadastrar Nova Planta"
                   disabled={isDialogOpen}
                 >
                   <PlusCircle className="mr-3 h-5 w-5" />
                   Cadastrar Planta
                 </Button>
                 <Button
                   size="lg"
                   variant="secondary"
                   className="w-full text-lg font-semibold button justify-start"
                   onClick={handleScanClick}
                   aria-label="Escanear QR Code da Planta"
                   disabled={isDialogOpen}
                 >
                   <ScanLine className="mr-3 h-5 w-5" />
                   Escanear QR Code
                 </Button>
               </CardContent>
             </Card>

              {/* Plants Needing Attention Card */}
              {isLoadingPlants ? (
                <Card className="shadow-md card border-destructive/30 p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-xl">Requer Atenção</CardTitle>
                   </div>
                   <div className="space-y-4">
                       <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
                       <p className="text-center text-muted-foreground text-sm">Carregando plantas...</p>
                   </div>
                </Card>
               ) : (
                 <AttentionPlants plants={attentionPlants} />
               )}


          </div>

           {/* Right Column (Recent Plants) */}
           <div className="lg:col-span-2">
              {isLoadingPlants ? (
                 <Card className="shadow-md card h-full flex flex-col p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Plantas Recentes</CardTitle>
                    </div>
                     <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                         <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                         <p className="text-center text-muted-foreground">Carregando plantas recentes...</p>
                     </div>
                 </Card>
              ) : (
                 <RecentPlants plants={recentPlants} />
              )}
           </div>

       </main>

      {/* Scanner Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[550px] dialog-content border-primary/20 bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-primary">Escanear QR Code</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground mt-1">
              Posicione o QR code da planta dentro da área demarcada.
            </DialogDescription>
          </DialogHeader>

          {/* Container for video and overlays */}
           <div className="relative mt-4 aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-lg bg-muted shadow-inner">
              {/* Video element */}
              <video
                  ref={videoRef}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                      ['initializing', 'scanning', 'stopped'].includes(scannerStatus) ? 'opacity-100' : 'opacity-0'
                  }`}
                  playsInline
                  muted
                  style={{ transform: 'scaleX(1)' }}
              />

             {/* Visual Guide Overlay */}
             {(scannerStatus === 'scanning' || scannerStatus === 'initializing') && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/70 to-background/90"></div>
                     <div className="relative w-[70%] h-[70%] border-2 border-primary/50 rounded-lg animate-pulse-border flex items-center justify-center overflow-hidden">
                         <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-accent animate-pulse rounded-tl-md z-20"></div>
                         <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-accent animate-pulse rounded-tr-md z-20"></div>
                         <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-accent animate-pulse rounded-bl-md z-20"></div>
                         <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-accent animate-pulse rounded-br-md z-20"></div>
                         {scannerStatus === 'scanning' && (
                           <div className="absolute bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_10px_1px_hsl(var(--accent)/0.6)] rounded-full animate-scan-line-vertical"/>
                         )}
                     </div>
                 </div>
             )}


             {/* Status Overlay */}
             {!['scanning', 'stopped'].includes(scannerStatus) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-background/90 via-background/95 to-background/90 text-center p-4 rounded-lg z-10 transition-opacity duration-300">
                       {scannerStatus === 'permission-pending' && (
                         <>
                           <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                           <p className="text-lg font-semibold">Aguardando Permissão...</p>
                           <p className="text-muted-foreground text-sm mt-1">Solicitando acesso à câmera.</p>
                         </>
                       )}
                       {scannerStatus === 'initializing' && (
                           <>
                               <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
                               <p className="text-lg font-semibold">Carregando Câmera...</p>
                               <p className="text-muted-foreground text-sm mt-1">Preparando o vídeo...</p>
                           </>
                       )}
                       {scannerStatus === 'idle' && (
                           <>
                               <Camera className="h-12 w-12 mb-4 text-muted-foreground" />
                               <p className="text-lg font-semibold text-muted-foreground">Pronto para escanear</p>
                               <p className="text-muted-foreground text-sm mt-1">A câmera será ativada.</p>
                           </>
                       )}
                       {scannerStatus === 'permission-denied' || (scannerStatus === 'error' && scannerError?.toLowerCase().includes('câmera')) && (
                         <>
                            {scannerStatus === 'permission-denied' ? (
                                <VideoOff className="h-12 w-12 mb-4 text-destructive" />
                            ) : (
                                <Camera className="h-12 w-12 mb-4 text-destructive" />
                            )}
                           <p className="text-lg font-semibold text-destructive">
                               {scannerStatus === 'permission-denied' ? 'Acesso Negado' : 'Erro na Câmera'}
                           </p>
                           <p className="text-muted-foreground text-sm mt-1 px-4">
                             {scannerError || 'Não foi possível acessar a câmera.'}
                           </p>
                            {scannerStatus === 'permission-denied' && (
                               <Button variant="outline" size="sm" className="mt-4 button" onClick={startCamera}>
                                    Tentar Novamente
                               </Button>
                            )}
                         </>
                       )}
                       {scannerStatus === 'error' && scannerError && !scannerError?.toLowerCase().includes('câmera') && (
                          <>
                            <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
                             <p className="text-lg font-semibold text-destructive">Erro no Leitor</p>
                            <p className="text-muted-foreground text-sm mt-1 px-4">
                                {scannerError}
                            </p>
                             <Button variant="outline" size="sm" className="mt-4 button" onClick={() => handleOpenChange(false)}>
                                 Fechar
                             </Button>
                          </>
                       )}
                  </div>
             )}
          </div>


          <DialogFooter className="mt-6 sm:justify-center">
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="button w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```
    </content>
  </change>
  <change>
    <file>src/app/plant/[qrCode]/page.tsx</file>
    <description>Update plant page to fetch data from Firestore using getPlantById.</description>
    <content><![CDATA[
'use client'; // Add 'use client' directive

import React, { useState, useEffect, useCallback, use } from 'react'; // Import hooks including 'use'
import { getPlantById, updatePlantStatus, CANNABIS_STAGES } from '@/services/plant-id'; // Import Firestore functions
import type { Plant } from '@/services/plant-id';
import PlantDiary from '@/components/plant/plant-diary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, QrCode, Calendar, Warehouse, Loader2, AlertCircle, Sprout, Pencil } from 'lucide-react'; // Added Pencil icon
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Define expected params structure remains the same
interface PlantPageProps {
  params: Promise<{ // Mark params as a Promise
    qrCode: string;
  }>;
}

// Component is now a standard function component, not async
export default function PlantPage({ params }: PlantPageProps) {
  // Use React.use to unwrap the params Promise
  const resolvedParams = use(params);
  const { qrCode: plantId } = resolvedParams; // Use qrCode as plantId
  const { toast } = useToast();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(''); // Local state for status
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Loading state for status update
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Fetch plant data from Firestore
  useEffect(() => {
    const fetchPlantData = async () => {
      setIsLoading(true);
      setError(null);
      setPlant(null);
      setCurrentStatus(''); // Reset status

      if (!plantId) {
          console.error("Plant ID (from QR Code) is missing in params.");
          setError("ID da planta inválido ou ausente.");
          setIsLoading(false);
          return;
      }

      try {
        console.log(`Fetching plant data for ID: ${plantId} from Firestore...`);
        const fetchedPlant = await getPlantById(plantId); // Use Firestore function
        if (!fetchedPlant) {
          setError(`Planta com ID '${plantId}' não encontrada no Firestore.`);
          console.warn(`Plant with ID '${plantId}' not found.`);
        } else {
          console.log(`Plant data fetched successfully for ${plantId}:`, fetchedPlant);
          setPlant(fetchedPlant);
          setCurrentStatus(fetchedPlant.status); // Initialize local status state
        }
      } catch (e) {
        console.error('Falha ao buscar dados da planta no Firestore:', e);
         setError(`Falha ao carregar dados da planta: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlantData();
  }, [plantId]); // Dependency array includes plantId

  // --- Handle Status Update ---
  const handleStatusChange = useCallback(async (newStatus: string) => {
     if (!plant || newStatus === currentStatus || isUpdatingStatus) {
       return; // No change or already updating
     }

     setIsUpdatingStatus(true);
     console.log(`Attempting to update status for plant ${plant.id} to ${newStatus} in Firestore`);

     try {
       await updatePlantStatus(plant.id, newStatus); // Use Firestore update function
       setCurrentStatus(newStatus); // Update local state on success
       setPlant(prevPlant => prevPlant ? { ...prevPlant, status: newStatus } : null); // Update plant object state too
       toast({
         title: "Status Atualizado",
         description: `O status da planta ${plant.strain} foi alterado para ${newStatus}.`,
         variant: "default",
       });
     } catch (err: any) {
       console.error('Falha ao atualizar status da planta no Firestore:', err);
       toast({
         variant: "destructive",
         title: "Erro ao Atualizar Status",
         description: err.message || 'Não foi possível alterar o status da planta.',
       });
     } finally {
       setIsUpdatingStatus(false);
     }
   }, [plant, currentStatus, isUpdatingStatus, toast]);


  // --- Loading State ---
  if (isLoading) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-primary/10">
          <Card className="w-full max-w-md text-center shadow-lg card p-6">
             <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
             <CardTitle className="text-xl text-muted-foreground">Carregando Dados da Planta...</CardTitle>
             <CardDescription className="text-muted-foreground mt-2">
                 Buscando informações para o ID: {plantId}
             </CardDescription>
          </Card>
        </div>
      );
  }

  // --- Error State ---
  if (error) {
    console.error(`Rendering error state: ${error}`);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-destructive/10">
        <Card className="w-full max-w-md text-center shadow-xl border-destructive/50 card">
           <CardHeader>
             <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit mb-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
             </div>
             <CardTitle className="text-destructive text-2xl">Erro ao Carregar Planta</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <p className="text-muted-foreground">{error}</p>
              <Button asChild variant="secondary" className="button">
                  <Link href="/">Voltar ao Painel</Link>
              </Button>
           </CardContent>
         </Card>
      </div>
    );
  }

  // --- Not Found State ---
  if (!plant) {
     console.log(`Rendering 'not found' state for Plant ID: ${plantId} after loading.`);
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
          <Card className="w-full max-w-md text-center shadow-lg card">
             <CardHeader>
                <Sprout className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                <CardTitle className="text-xl text-muted-foreground">Planta Não Encontrada</CardTitle>
             </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Não foi possível encontrar detalhes para a planta com ID: {plantId}. Pode ter sido removida ou o ID/QR Code está incorreto.</p>
                 <Button asChild variant="secondary" className="button">
                    <Link href="/">Voltar ao Painel</Link>
                </Button>
              </CardContent>
           </Card>
        </div>
      );
  }

  // --- Success State ---
  console.log(`Rendering success state for plant: ${plant.strain} (${plant.id}) with status: ${currentStatus}`);
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <Card className="shadow-lg overflow-hidden border-primary/20 card">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Plant Title and Info */}
                    <div className="flex items-center gap-3">
                         <div className="bg-primary/10 p-3 rounded-lg">
                            <Leaf className="h-8 w-8 text-primary" />
                         </div>
                         <div>
                            <CardTitle className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                               {plant.strain}
                             </CardTitle>
                             <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                               <QrCode className="h-4 w-4" /> ID: {plant.id}
                             </CardDescription>
                         </div>
                    </div>
                    {/* Status Badge and Selector */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <Badge variant="secondary" className="text-base px-3 py-1 font-medium shadow-sm flex items-center gap-1.5">
                            Status: {currentStatus}
                        </Badge>
                        {/* Status Change Select */}
                        <Select
                            value={currentStatus}
                            onValueChange={handleStatusChange}
                            disabled={isUpdatingStatus}
                        >
                            <SelectTrigger
                                className="w-auto h-9 px-2 py-1 text-xs shadow-sm button focus:ring-offset-0 focus:ring-primary/50"
                                aria-label="Alterar status da planta"
                            >
                                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin"/> : <Pencil className="h-3 w-3" />}
                            </SelectTrigger>
                            <SelectContent align="end">
                                {CANNABIS_STAGES.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                        {stage}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Calendar className="h-5 w-5 text-secondary flex-shrink-0" />
                     {/* Format date from ISO string */}
                     <span className="text-foreground"><strong className="font-medium">Plantada em:</strong> {plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Data desconhecida'}</span>
                </div>
                 <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                   <Warehouse className="h-5 w-5 text-secondary flex-shrink-0" />
                    <span className="text-foreground"><strong className="font-medium">Sala de Cultivo:</strong> {plant.growRoomId || 'N/A'}</span>
                </div>
                 {/* Placeholder for creation date */}
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                     <CalendarDays className="h-5 w-5 text-secondary flex-shrink-0" />
                     <span className="text-foreground"><strong className="font-medium">Cadastrada em:</strong> {plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data desconhecida'}</span>
                  </div>
            </CardContent>
        </Card>

      {/* Pass plant ID to the diary component */}
      <PlantDiary plantId={plant.id} />

      {/* Back to Dashboard Button */}
      <div className="text-center mt-8">
           <Button asChild variant="outline" className="button">
              <Link href="/">
                 Voltar ao Painel
              </Link>
          </Button>
      </div>
    </div>
  );
}

```
    </content>
  </change>
  <change>
    <file>src/app/plants/page.tsx</file>
    <description>Update all plants page to fetch data from Firestore via getAllPlants.</description>
    <content><![CDATA[
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPlants, CANNABIS_STAGES, Plant } from '@/services/plant-id'; // Import Firestore functions
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, ListFilter, X, ArrowRight, Sprout, History, Search } from 'lucide-react'; // Added Search
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast'; // Import useToast

const ALL_STATUSES_VALUE = "all_statuses";
const ALL_ROOMS_VALUE = "all_rooms";

interface Filters {
  search: string;
  status: string; // Will store the actual status or empty string if 'all' is selected
  growRoom: string; // Will store the actual room or empty string if 'all' is selected
}

export default function AllPlantsPage() {
  const { toast } = useToast();
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]);
  // Store the raw filter selection, including "all" values
  const [selectedFilters, setSelectedFilters] = useState<{ search: string; status: string; growRoom: string }>({ search: '', status: ALL_STATUSES_VALUE, growRoom: ALL_ROOMS_VALUE });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plants from Firestore on mount
  useEffect(() => {
    const fetchPlants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("Fetching all plants from Firestore service...");
        const fetchedPlants = await getAllPlants(); // Use Firestore function
        console.log(`Fetched ${fetchedPlants.length} plants.`);
        setAllPlants(fetchedPlants);
      } catch (e) {
        console.error('Failed to fetch all plant data from Firestore:', e);
        setError(`Falha ao carregar a lista de plantas: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
         toast({
           variant: 'destructive',
           title: 'Erro ao Carregar Plantas',
           description: `Não foi possível buscar os dados das plantas. ${e instanceof Error ? e.message : ''}`,
         });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlants();
  }, [toast]); // Add toast to dependency array

  // Filter plants when selectedFilters or allPlants change
  useEffect(() => {
    console.log("Applying filters based on selections:", selectedFilters);
    let filtered = [...allPlants];

    // Apply search filter (strain name)
    if (selectedFilters.search) {
      filtered = filtered.filter(plant =>
        plant.strain.toLowerCase().includes(selectedFilters.search.toLowerCase())
      );
    }

    // Apply status filter (only if not 'all')
    if (selectedFilters.status && selectedFilters.status !== ALL_STATUSES_VALUE) {
      filtered = filtered.filter(plant => plant.status === selectedFilters.status);
    }

    // Apply grow room filter (only if not 'all')
    if (selectedFilters.growRoom && selectedFilters.growRoom !== ALL_ROOMS_VALUE) {
      filtered = filtered.filter(plant => plant.growRoomId === selectedFilters.growRoom);
    }

    console.log(`Filtered down to ${filtered.length} plants.`);
    setDisplayedPlants(filtered);
  }, [selectedFilters, allPlants]);

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
     setSelectedFilters(prevFilters => ({
        ...prevFilters,
        [filterName]: value,
     }));
  };

  const clearFilters = () => {
    setSelectedFilters({ search: '', status: ALL_STATUSES_VALUE, growRoom: ALL_ROOMS_VALUE });
  };

  // Get unique grow rooms for the filter dropdown
  const uniqueGrowRooms = useMemo(() => {
    const rooms = new Set(allPlants.map(plant => plant.growRoomId).filter(Boolean)); // Filter out potential null/empty values
    return Array.from(rooms).sort();
  }, [allPlants]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card className="shadow-lg border-primary/10 card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-3">
                  <History className="h-7 w-7 text-primary" />
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Todas as Plantas</CardTitle>
                    <CardDescription>Visualize e filtre seu inventário de plantas.</CardDescription>
                  </div>
             </div>
             <Button variant="outline" onClick={() => window.history.back()} className="button self-start sm:self-center">
                Voltar
             </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters Card */}
      <Card className="shadow-md card">
        <CardHeader>
            <div className="flex items-center gap-2">
                <ListFilter className="h-5 w-5 text-secondary"/>
                <CardTitle className="text-xl">Filtros</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="space-y-1">
             <label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Search className="h-4 w-4"/> Pesquisar Variedade</label>
            <Input
              id="search-filter"
              placeholder="Nome da variedade..."
              value={selectedFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
            />
          </div>

          {/* Status Select */}
          <div className="space-y-1">
             <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Sprout className="h-4 w-4"/> Filtrar por Status</label>
            <Select
                value={selectedFilters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger id="status-filter" className="input">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES_VALUE}>Todos os Status</SelectItem>
                {CANNABIS_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grow Room Select */}
          <div className="space-y-1">
              <label htmlFor="room-filter" className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Sprout className="h-4 w-4"/> Filtrar por Sala</label>
             <Select
                value={selectedFilters.growRoom}
                onValueChange={(value) => handleFilterChange('growRoom', value)}
                disabled={uniqueGrowRooms.length === 0}
             >
               <SelectTrigger id="room-filter" className="input">
                 <SelectValue placeholder="Todas as Salas" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_ROOMS_VALUE}>Todas as Salas</SelectItem>
                 {uniqueGrowRooms.map((room) => (
                   <SelectItem key={room} value={room}>{room}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full lg:w-auto button"
                disabled={
                    !selectedFilters.search &&
                    selectedFilters.status === ALL_STATUSES_VALUE &&
                    selectedFilters.growRoom === ALL_ROOMS_VALUE
                }
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plants List */}
      <Card className="shadow-md card">
        <CardHeader>
          <CardTitle>Resultados ({displayedPlants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-10">{error}</p>
          ) : displayedPlants.length === 0 ? (
             allPlants.length > 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhuma planta encontrada com os filtros aplicados.</p>
             ) : (
                 <p className="text-center text-muted-foreground py-10">Nenhuma planta cadastrada ainda.</p>
             )
          ) : (
            <ul className="divide-y divide-border">
              {displayedPlants.map((plant) => (
                <li key={plant.id} className="py-3 group hover:bg-muted/30 rounded-md transition-colors duration-150">
                   {/* Link uses plant.id now, assuming qrCode === id */}
                  <Link href={`/plant/${plant.id}`} className="flex items-center space-x-4 px-2">
                    <div className="flex-shrink-0">
                      <Image
                        data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                        src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}-${plant.id}/100/100`}
                        alt={`Foto de ${plant.strain}`}
                        width={50}
                        height={50}
                        className="rounded-md object-cover border border-border/50 aspect-square"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                         <span>·</span>
                         <span>Sala: {plant.growRoomId}</span>
                         <span>·</span>
                         {/* Format date from ISO string */}
                         <span>{`Plantada: ${plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A'}`}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```
    </content>
  </change>
  <change>
    <file>src/app/register-plant/page.tsx</file>
    <description>Update register plant page to save data to Firestore via the addPlant service function.</description>
    <content><![CDATA[
'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Calendar, Warehouse, Loader2, ArrowLeft, Sprout, CheckCircle, Download } from '@/components/ui/lucide-icons'; // Use centralized icons
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addPlant, type Plant } from '@/services/plant-id'; // Import Firestore function
import Link from 'next/link';
import { generateUniqueId } from '@/lib/utils';
import { QrCode as QrCodeIcon } from 'lucide-react'; // Specific import if needed
import { toDataURL } from 'qrcode'; // Import QR code generation function
import Image from 'next/image'; // Import Next Image component
import { firebaseInitializationError } from '@/lib/firebase/config'; // Import Firebase error state


// Define the schema for plant registration
const registerPlantSchema = z.object({
  strain: z.string().min(1, 'O nome da variedade é obrigatório.').max(100, 'Nome da variedade muito longo.'),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de nascimento inválida.',
  }),
  growRoomId: z.string().min(1, 'O ID da sala de cultivo é obrigatório.').max(50, 'ID da sala muito longo.'),
  status: z.string().min(1, 'O status inicial é obrigatório (ex: Plântula, Vegetativo)').max(50, 'Status muito longo.'),
});

type RegisterPlantFormData = z.infer<typeof registerPlantSchema>;

export default function RegisterPlantPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);
  const [qrCodeImageDataUrl, setQrCodeImageDataUrl] = useState<string | null>(null);


  const form = useForm<RegisterPlantFormData>({
    resolver: zodResolver(registerPlantSchema),
    defaultValues: {
      strain: '',
      birthDate: '',
      growRoomId: '',
      status: 'Plântula',
    },
  });

  // Callback function to download the QR code
  const downloadQrCode = useCallback(() => {
    if (!qrCodeImageDataUrl || !generatedQrCode) return;

    const link = document.createElement('a');
    link.href = qrCodeImageDataUrl;
    link.download = `qrcode-planta-${generatedQrCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
     toast({
        title: 'Download Iniciado',
        description: `Baixando QR code para ${generatedQrCode}.png`,
     });
  }, [qrCodeImageDataUrl, generatedQrCode, toast]);

  const onSubmit = async (data: RegisterPlantFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setGeneratedQrCode(null);
    setQrCodeImageDataUrl(null);

    // Check for Firebase initialization errors before proceeding
    if (firebaseInitializationError) {
        console.error("Firebase initialization error:", firebaseInitializationError);
        setSubmitError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível salvar.`);
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'Não foi possível conectar ao banco de dados. Verifique as configurações do Firebase.',
        });
        setIsSubmitting(false);
        return;
    }


    try {
      // Generate a unique ID for the plant, which will also be the QR code content
      const uniqueId = generateUniqueId(); // Use the existing utility

      // Construct the new plant object for Firestore
      const newPlantData: Plant = {
        id: uniqueId, // Use generated ID as Firestore document ID
        qrCode: uniqueId, // QR Code content is the same as the ID
        strain: data.strain,
        birthDate: new Date(data.birthDate).toISOString(), // Store as ISO string
        growRoomId: data.growRoomId,
        status: data.status,
        createdAt: new Date().toISOString(), // Add creation timestamp
      };

      console.log('Tentando cadastrar planta no Firestore:', newPlantData);

      // Generate QR Code Image Data URL
      let qrImageDataUrl = null;
      try {
        qrImageDataUrl = await toDataURL(uniqueId, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            scale: 8,
            color: { dark: '#000000', light: '#FFFFFF' },
        });
         setQrCodeImageDataUrl(qrImageDataUrl);
      } catch (qrError) {
         console.error("Erro ao gerar a imagem do QR Code:", qrError);
         throw new Error("Falha ao gerar a imagem do QR Code.");
      }


      // Call the service function to add the plant to Firestore
      await addPlant(newPlantData);

      console.log('Planta cadastrada com sucesso no Firestore com ID:', uniqueId);
      setGeneratedQrCode(uniqueId);


      toast({
        title: 'Planta Cadastrada!',
        description: (
           <div>
               <p>A planta '{data.strain}' foi adicionada com sucesso.</p>
               <p className="font-semibold mt-2">QR Code / ID: {uniqueId}</p>
           </div>
        ),
        variant: 'default',
        duration: 10000,
      });

      // Keep form data for potentially adding another plant quickly
      // form.reset();


    } catch (error: any) {
      console.error('Erro ao cadastrar planta no Firestore:', error);
      const errorMsg = error.message || 'Falha ao cadastrar a planta. Verifique os dados ou tente novamente.';
      setSubmitError(errorMsg);
      setQrCodeImageDataUrl(null); // Clear image on error
      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-muted/50 to-primary/10 text-foreground">
       <Card className="w-full max-w-lg shadow-xl border-primary/20 card">
         <CardHeader className="relative">
            <Button variant="ghost" size="icon" className="absolute top-3 left-3 button" asChild>
               <Link href="/" aria-label="Voltar ao Painel">
                  <ArrowLeft className="h-5 w-5" />
               </Link>
            </Button>
           <div className="flex flex-col items-center text-center pt-8">
               <Image
                   src="/budscan-logo.png"
                   alt="BudScan Logo"
                   width={180}
                   height={51}
                   priority
                   className="mb-3"
               />
              <CardDescription className="text-muted-foreground mt-1">
                Preencha os detalhes da nova planta. O QR Code será gerado automaticamente.
              </CardDescription>
           </div>
         </CardHeader>
         <CardContent className="pt-6">
           {/* Display generated QR code if available */}
           {generatedQrCode && qrCodeImageDataUrl && !isSubmitting && (
             <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/30 p-4 text-center card">
                <CardHeader className="p-0 pb-2">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <CardTitle className="text-lg text-green-700 dark:text-green-300">Planta Cadastrada!</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                   <p className="text-sm text-muted-foreground mb-2">O QR Code / ID único para esta planta é:</p>
                   <div className="flex items-center justify-center gap-2 bg-muted p-2 rounded-md">
                       <QrCodeIcon className="h-5 w-5 text-primary" />
                       <p className="text-lg font-mono font-semibold text-primary break-all">{generatedQrCode}</p>
                   </div>
                    {/* Display QR Code Image */}
                    <div className="mt-3 flex flex-col items-center">
                       <Image
                           src={qrCodeImageDataUrl}
                           alt={`QR Code para ${generatedQrCode}`}
                           width={180}
                           height={180}
                           className="border-2 border-muted p-1 rounded-md shadow-md bg-white"
                           priority
                       />
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadQrCode}
                            className="mt-4 button"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Baixar QR Code
                        </Button>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => {
                         router.push('/')
                       }} className="mt-5 button">
                         Ir para o Painel
                     </Button>
                      <Button variant="link" size="sm" onClick={() => {
                          setGeneratedQrCode(null);
                          setQrCodeImageDataUrl(null);
                          setSubmitError(null);
                          form.reset();
                          toast({ title: "Formulário limpo", description: "Pronto para cadastrar outra planta."});
                      }} className="mt-1 button">
                         Cadastrar Outra Planta
                     </Button>
                </CardContent>
             </Card>
           )}

           {/* Hide form if successfully submitted and QR code is shown */}
           {(!generatedQrCode || isSubmitting) && (
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Strain Name */}
                    <FormField
                    control={form.control}
                    name="strain"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Leaf className="h-4 w-4 text-secondary" /> Variedade (Strain)
                        </FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Northern Lights, Purple Haze..." {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {/* Birth Date */}
                    <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-secondary" /> Data de Nascimento / Plantio
                        </FormLabel>
                        <FormControl>
                            <Input type="date" {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input appearance-none"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {/* Grow Room ID */}
                    <FormField
                    control={form.control}
                    name="growRoomId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-secondary" /> ID da Sala de Cultivo
                        </FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Tenda Veg, Sala Flora 1" {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    {/* Initial Status */}
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                            <Sprout className="h-4 w-4 text-secondary" /> Status Inicial
                            </FormLabel>
                            <FormControl>
                            <Input placeholder="Ex: Plântula, Vegetativo" {...field} disabled={isSubmitting || !!firebaseInitializationError} className="input"/>
                            </FormControl>
                            <FormDescription>O estágio inicial da planta.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />


                    {/* Submit Error Display */}
                    {submitError && (
                        <div className="text-sm font-medium text-destructive text-center bg-destructive/10 p-3 rounded-md">
                        {submitError}
                        </div>
                    )}
                     {firebaseInitializationError && !submitError && (
                         <div className="text-sm font-medium text-destructive text-center bg-destructive/10 p-3 rounded-md">
                             Erro de Configuração: {firebaseInitializationError.message}. Não é possível salvar.
                         </div>
                     )}

                    {/* Submit Button */}
                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isSubmitting || !!firebaseInitializationError}>
                    {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cadastrando...
                    </>
                    ) : (
                    'Cadastrar Planta e Gerar QR Code'
                    )}
                </Button>
                </form>
            </Form>
           )}
         </CardContent>
       </Card>
    </div>
  );
}
```
    </content>
  </change>
  <change>
    <file>src/types/diary-entry.ts</file>
    <description>Rewrite diary entry service functions to use Firestore instead of localStorage.</description>
    <content><![CDATA[
import { db, firebaseInitializationError } from '@/lib/firebase/config';
import {
    collection,
    addDoc, // Use addDoc for auto-generated IDs for entries
    query,
    where,
    orderBy,
    getDocs,
    Timestamp,
    doc, // Needed for collection path construction
    limit as firestoreLimit,
} from 'firebase/firestore';

/**
 * Representa uma única entrada no diário de uma planta.
 */
export interface DiaryEntry {
  /**
   * Identificador único para a entrada do diário (gerado pelo Firestore).
   */
  id: string;
  /**
   * ID da planta à qual esta entrada pertence.
   */
  plantId: string;
  /**
   * Timestamp ISO 8601 de quando a entrada foi criada.
   */
  timestamp: string; // Store as ISO string in object
  /**
   * ID do usuário (Firebase UID ou placeholder) que criou a entrada.
   */
  authorId: string;
  /**
   * Notas textuais ou observações.
   */
  note: string;
  /**
   * Estágio de crescimento (ex: Plântula, Vegetativo, Floração, Colhida).
   */
  stage?: string | null;
  /**
   * Altura da planta em centímetros.
   */
  heightCm?: number | null;
  /**
   * Leitura de Condutividade Elétrica (EC).
   */
  ec?: number | null;
  /**
   * Leitura do nível de pH.
   */
  ph?: number | null;
  /**
   * Leitura de temperatura (°C).
   */
  temp?: number | null;
  /**
   * Leitura de umidade (%).
   */
  humidity?: number | null;
  /**
   * URL de uma foto associada (opcional).
   * Pode ser um data URI ou URL para armazenamento em nuvem.
   * CONSIDERATION: Storing large data URIs in Firestore is inefficient. Use Firebase Storage instead.
   * For now, we'll store it as is, but this should be revisited for production.
   */
  photoUrl?: string | null;
  /**
   * Resumo gerado pela análise de IA da foto (opcional).
   */
  aiSummary?: string | null;
}

// Firestore Collection Path: /plants/{plantId}/diaryEntries
const getDiaryEntriesCollectionRef = (plantId: string) => {
   ensureDbAvailable();
   return collection(db!, 'plants', plantId, 'diaryEntries');
};

// Helper to check Firestore availability
function ensureDbAvailable() {
  if (firebaseInitializationError) {
    console.error("Firebase initialization failed:", firebaseInitializationError);
    throw new Error(`Firebase não inicializado: ${firebaseInitializationError.message}`);
  }
  if (!db) {
    throw new Error('Instância do Firestore não está disponível. A inicialização pode ter falhado silenciosamente.');
  }
}

/**
 * Loads diary entries for a specific plant from Firestore.
 * @param plantId The ID of the plant whose entries to load.
 * @returns An array of DiaryEntry objects, sorted newest first, or empty array.
 */
export async function loadDiaryEntriesFromFirestore(plantId: string): Promise<DiaryEntry[]> {
  ensureDbAvailable();
  console.log(`Carregando entradas do diário para planta ${plantId} do Firestore...`);
  try {
    const diaryEntriesCollection = getDiaryEntriesCollectionRef(plantId);
    const q = query(diaryEntriesCollection, orderBy('timestamp', 'desc')); // Order by Firestore timestamp
    const querySnapshot = await getDocs(q);

    const entries: DiaryEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore Timestamp back to ISO string
      const timestamp = (data.timestamp as Timestamp)?.toDate().toISOString() ?? data.timestamp;
      entries.push({
        ...data,
        id: doc.id,
        timestamp: timestamp,
      } as DiaryEntry);
    });
    console.log(`Carregadas ${entries.length} entradas do diário.`);
    return entries; // Already sorted by Firestore query
  } catch (error) {
    console.error(`Erro ao carregar entradas do diário para ${plantId} do Firestore:`, error);
    throw new Error(`Falha ao carregar entradas do diário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Adds a single new diary entry for a plant to Firestore.
 * Firestore generates the ID automatically.
 * @param plantId The ID of the plant.
 * @param newEntryData The DiaryEntry data to add (without the 'id' field).
 * @returns The newly created DiaryEntry object with its Firestore-generated ID.
 */
export async function addDiaryEntryToFirestore(plantId: string, newEntryData: Omit<DiaryEntry, 'id'>): Promise<DiaryEntry> {
    ensureDbAvailable();
    console.log(`Adicionando entrada do diário para planta ${plantId} no Firestore:`, newEntryData);
    try {
        const diaryEntriesCollection = getDiaryEntriesCollectionRef(plantId);
        const dataToSave = {
          ...newEntryData,
          timestamp: Timestamp.fromDate(new Date(newEntryData.timestamp)), // Convert ISO string to Timestamp
        };

        // Use addDoc to let Firestore generate the ID
        const docRef = await addDoc(diaryEntriesCollection, dataToSave);
        console.log(`Entrada do diário adicionada com ID: ${docRef.id} para planta ${plantId}`);

        // Return the full entry object including the new ID
        return {
            ...newEntryData,
            id: docRef.id,
        };

    } catch (error) {
        console.error(`Erro ao adicionar entrada do diário para planta ${plantId} no Firestore:`, error);
        throw new Error(`Falha ao adicionar entrada do diário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}


// --- Deprecated localStorage Functions (commented out or removed) ---

const DIARY_STORAGE_PREFIX = 'budscanDiary_DISABLED_'; // Disable localStorage prefix

/**
 * Loads diary entries for a specific plant from localStorage.
 * @param plantId The ID of the plant whose entries to load.
 * @returns An array of DiaryEntry objects, sorted newest first, or empty array.
 * @deprecated Use loadDiaryEntriesFromFirestore instead.
 */
export function loadDiaryEntriesFromLocalStorage(plantId: string): DiaryEntry[] {
  console.warn(`loadDiaryEntriesFromLocalStorage (plant ${plantId}) está desabilitado. Usando Firestore.`);
  return [];
}

/**
 * Saves diary entries for a specific plant to localStorage.
 * Overwrites existing entries for that plant.
 * @param plantId The ID of the plant whose entries to save.
 * @param entries The array of DiaryEntry objects to save.
 * @deprecated Use addDiaryEntryToFirestore instead.
 */
export function saveDiaryEntriesToLocalStorage(plantId: string, entries: DiaryEntry[]): void {
    console.warn(`saveDiaryEntriesToLocalStorage (plant ${plantId}) está desabilitado. Usando Firestore.`);
}

/**
 * Adds a single new diary entry for a plant to localStorage.
 * Loads existing entries, adds the new one, sorts, and saves back.
 * @param plantId The ID of the plant.
 * @param newEntry The new DiaryEntry object to add.
 * @deprecated Use addDiaryEntryToFirestore instead.
 */
export function addDiaryEntryToLocalStorage(plantId: string, newEntry: DiaryEntry): void {
     console.warn(`addDiaryEntryToLocalStorage (plant ${plantId}) está desabilitado. Usando Firestore.`);
}
```
    </content>
  </change>
  <change>
    <file>src/components/plant/plant-diary.tsx</file>
    <description>Update PlantDiary component to load and add entries using Firestore service functions.</description>
    <content><![CDATA[
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiaryEntryForm } from './diary-entry-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
    Lightbulb, Droplet, Ruler, StickyNote, Thermometer, Microscope, AlertTriangle,
    Activity, CalendarDays, Bot, User, TestTube2, Loader2, RefreshCw
} from 'lucide-react'; // Added User, TestTube2
import { Badge } from '@/components/ui/badge';
import type { DiaryEntry } from '@/types/diary-entry';
// Import Firestore functions for diary entries
import { loadDiaryEntriesFromFirestore, addDiaryEntryToFirestore } from '@/types/diary-entry';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Button } from '@/components/ui/button'; // Import Button for refresh
import { firebaseInitializationError } from '@/lib/firebase/config'; // Import Firebase error state

interface PlantDiaryProps {
  plantId: string;
}

export default function PlantDiary({ plantId }: PlantDiaryProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to memoize the load function
  const loadEntries = useCallback(async () => {
    // Check Firebase availability before loading
    if (firebaseInitializationError) {
        setError(`Firebase não inicializado: ${firebaseInitializationError.message}`);
        setIsLoading(false);
        return;
    }
     if (!plantId) {
       console.warn("loadEntries called without plantId.");
       setError("ID da planta não fornecido para carregar o diário.");
       setIsLoading(false);
       return;
     }

    console.log(`Loading entries for plant ${plantId} from Firestore...`);
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEntries = await loadDiaryEntriesFromFirestore(plantId); // Use Firestore function
      console.log(`Loaded ${fetchedEntries.length} entries from Firestore.`);
      setEntries(fetchedEntries); // Already sorted by Firestore query
    } catch (err: any) {
      console.error('Falha ao buscar entradas do diário no Firestore:', err);
      setError(`Não foi possível carregar as entradas do diário: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  }, [plantId]); // Dependency is plantId

  useEffect(() => {
    console.log("PlantDiary useEffect triggered for plantId:", plantId);
    loadEntries(); // Load entries when plantId changes or component mounts
    // No cleanup needed here unless there were subscriptions
  }, [loadEntries]); // Run effect when loadEntries changes (due to plantId change)

   // Handler for when DiaryEntryForm submits a new entry
   // This function is called by DiaryEntryForm AFTER it successfully saves to Firestore
   const handleNewEntry = (newlyAddedEntry: DiaryEntry) => {
       console.log('Handling new entry in PlantDiary (already saved to Firestore):', newlyAddedEntry);
       // Optimistically update the local state
       // Add the new entry to the beginning (assuming Firestore returns the added doc)
       setEntries(prevEntries => [newlyAddedEntry, ...prevEntries]);
       // No need to re-sort if Firestore query sorts and we prepend
   };


  return (
    <div className="space-y-8">
      {/* Show form, disable if Firebase has init errors */}
      <DiaryEntryForm
        plantId={plantId}
        onNewEntry={handleNewEntry}
        // Pass disabled state based on Firebase init error
        // (Need to add a disabled prop to DiaryEntryForm if not already present)
        // disabled={!!firebaseInitializationError}
      />


      {/* Display existing entries */}
      <Card className="shadow-lg border-primary/10 card">
        <CardHeader className="flex flex-row justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b pb-3 pt-4 px-4">
            <div>
                <CardTitle className="text-2xl">Histórico do Diário</CardTitle>
                <CardDescription>Registro cronológico de observações e ações.</CardDescription>
            </div>
             <Button variant="outline" size="sm" onClick={loadEntries} disabled={isLoading || !!firebaseInitializationError} className="button">
                 {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                 {isLoading ? 'Atualizando...' : 'Atualizar'}
             </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 px-4">
          {/* Display Firebase Init Error first */}
           {firebaseInitializationError && !error && ( // Show only if no other loading error
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro de Configuração do Firebase</AlertTitle>
                <AlertDescription>{firebaseInitializationError.message}. Não é possível carregar ou salvar entradas.</AlertDescription>
              </Alert>
           )}

           {isLoading && (
              <div className="space-y-6 pt-4">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
           )}
           {error && !firebaseInitializationError && ( // Show specific loading error if no init error
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Diário</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
           )}


          {!isLoading && !error && !firebaseInitializationError && entries.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg mt-4">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 text-secondary/50"/>
                <p className="font-medium">Nenhuma entrada no diário ainda.</p>
                <p className="text-sm">Adicione a primeira entrada usando o formulário acima!</p>
            </div>
          )}

          {/* Entries List - Only show if no errors and not loading */}
          {!isLoading && !error && !firebaseInitializationError && entries.length > 0 && (
            <div className="space-y-6 mt-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="border shadow-md overflow-hidden bg-card/60 card">
                    <CardHeader className="bg-muted/40 p-3 px-4 flex flex-row justify-between items-center">
                       <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-primary"/>
                          <span className="font-semibold text-sm text-foreground/90">
                             {/* Format date from ISO string */}
                             {entry.timestamp ? new Date(entry.timestamp).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Data inválida'}
                          </span>
                       </div>
                      {entry.stage && <Badge variant="outline" className="text-xs px-2 py-0.5">{entry.stage}</Badge>}
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                      {/* Sensor/Measurement Data */}
                      {(entry.heightCm || entry.ec !== null || entry.ph !== null || entry.temp !== null || entry.humidity !== null) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs text-muted-foreground border-b pb-3 mb-3">
                              {entry.heightCm && <div className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-secondary" /> <span>{entry.heightCm} cm</span></div>}
                              {entry.ec !== null && typeof entry.ec !== 'undefined' && <div className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-secondary" /> <span>EC: {entry.ec}</span></div>}
                              {entry.ph !== null && typeof entry.ph !== 'undefined' && <div className="flex items-center gap-1.5"><TestTube2 className="h-4 w-4 text-secondary" /> <span>pH: {entry.ph}</span></div>}
                              {entry.temp !== null && typeof entry.temp !== 'undefined' && <div className="flex items-center gap-1.5"><Thermometer className="h-4 w-4 text-secondary" /> <span>{entry.temp}°C</span></div>}
                              {entry.humidity !== null && typeof entry.humidity !== 'undefined' && <div className="flex items-center gap-1.5"><Droplet className="h-4 w-4 text-secondary" /> <span>{entry.humidity}%</span></div>}
                          </div>
                      )}

                       {/* Photo and AI Analysis Side-by-Side */}
                       <div className="flex flex-col lg:flex-row gap-4">
                           {/* Photo */}
                           {entry.photoUrl && (
                             <div className="lg:w-1/2 flex-shrink-0">
                               {/* Display Data URI directly or Cloud Storage URL */}
                               <Image
                                  data-ai-hint={entry.aiSummary ? `cannabis analysis ${entry.stage?.toLowerCase()}` : `cannabis plant ${entry.stage?.toLowerCase()} diary photo`}
                                  src={entry.photoUrl}
                                  alt={`Foto da planta em ${entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('pt-BR') : ''}`}
                                  width={400}
                                  height={300}
                                  className="rounded-lg shadow-md w-full h-auto object-cover border"
                                  onError={(e) => {
                                     console.warn(`Failed to load image: ${entry.photoUrl}. Using placeholder.`);
                                     (e.target as HTMLImageElement).src = `https://picsum.photos/seed/cannabis-placeholder/400/300`;
                                     (e.target as HTMLImageElement).srcset = '';
                                  }}
                                />
                             </div>
                           )}

                           {/* AI Analysis or Note */}
                           <div className={`flex-1 ${entry.photoUrl ? 'lg:w-1/2' : 'w-full'}`}>
                               {entry.aiSummary && (
                                 <Card className="bg-accent/10 border-accent shadow-sm mb-4">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-accent-foreground/90">
                                            <Bot className="h-5 w-5" /> Análise da IA
                                        </CardTitle>
                                    </CardHeader>
                                   <CardContent className="p-3 pt-0 text-sm text-accent-foreground/80">
                                     <p>{entry.aiSummary}</p>
                                   </CardContent>
                                 </Card>
                               )}

                                {/* Note */}
                                {entry.note && (
                                   <div className="text-sm text-foreground space-y-2">
                                     <h4 className="font-semibold flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-secondary" /> Observações</h4>
                                      <p className="pl-1 leading-relaxed whitespace-pre-wrap">{entry.note}</p>
                                   </div>
                                )}
                           </div>
                       </div>


                        {/* Author */}
                        <div className="text-xs text-muted-foreground text-right pt-2 border-t mt-4 flex justify-end items-center gap-1">
                           <User className="h-3.5 w-3.5"/>
                            Registrado por: <span className="font-medium" title={entry.authorId}>
                                {entry.authorId === 'guest-user' ? 'Usuário Convidado' : `Usuário (${entry.authorId.substring(0, 6)}...)`}
                           </span>
                        </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```
    </content>
  </change>
  <change>
    <file>src/components/plant/diary-entry-form.tsx</file>
    <description>Update DiaryEntryForm to save entries using the Firestore service function (addDiaryEntryToFirestore).</description>
    <content><![CDATA[
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Leaf, Bot, Loader2, AlertCircle, ImagePlus, RefreshCw, XCircle, VideoOff, Download } from 'lucide-react'; // Removed Upload
import Image from 'next/image';
import { analyzePlantPhoto, type AnalyzePlantPhotoOutput } from '@/ai/flows/analyze-plant-photo';
import type { DiaryEntry } from '@/types/diary-entry';
// Import Firestore add function
import { addDiaryEntryToFirestore } from '@/types/diary-entry';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { firebaseInitializationError } from '@/lib/firebase/config'; // Import Firebase error state

const diaryEntrySchema = z.object({
  note: z.string().min(1, 'A nota não pode estar vazia').max(1000, 'Nota muito longa (máx 1000 caracteres)'),
  stage: z.string().optional(),
  heightCm: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
      z.number({ invalid_type_error: 'Altura deve ser um número' }).positive("Altura deve ser positiva").optional().nullable()
  ),
  ec: z.preprocess(
       (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
       z.number({ invalid_type_error: 'EC deve ser um número' }).positive("EC deve ser positivo").optional().nullable()
  ),
  ph: z.preprocess(
       (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
        z.number({ invalid_type_error: 'pH deve ser um número' }).min(0).max(14, "pH deve estar entre 0 e 14").optional().nullable()
  ),
  temp: z.preprocess(
         (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
         z.number({ invalid_type_error: 'Temperatura deve ser um número' }).optional().nullable()
   ),
  humidity: z.preprocess(
         (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
          z.number({ invalid_type_error: 'Umidade não pode ser negativa' }).min(0, "Umidade não pode ser negativa").max(100, "Umidade não pode ser maior que 100").optional().nullable()
   ),
});

type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;

interface DiaryEntryFormProps {
  plantId: string;
  onNewEntry: (entry: DiaryEntry) => void;
  // disabled?: boolean; // Optional disabled prop
}

type CameraStatus = 'idle' | 'permission-pending' | 'permission-denied' | 'streaming' | 'error';

// Placeholder author ID when authentication is disabled
const GUEST_AUTHOR_ID = "guest-user";

export function DiaryEntryForm({ plantId, onNewEntry /*, disabled = false */ }: DiaryEntryFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePlantPhotoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { toast } = useToast();

  // Camera related state
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraView, setShowCameraView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Determine if the form should be globally disabled
  const isDisabled = isSubmitting || isAnalyzing || showCameraView || !!firebaseInitializationError;


  const form = useForm<DiaryEntryFormData>({
    resolver: zodResolver(diaryEntrySchema),
    defaultValues: {
      note: '',
      stage: undefined,
      heightCm: undefined,
      ec: undefined,
      ph: undefined,
      temp: undefined,
      humidity: undefined,
    },
  });

  // --- Stop Media Stream ---
  const stopMediaStream = useCallback(() => {
    console.log("Attempting to stop media stream in Diary Form...");
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log("Media stream stopped.");
    } else {
        console.log("No active media stream to stop.");
    }
    if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
        console.log("Video source object cleared.");
    }
    setCameraStatus('idle');
  }, []);

  // --- Request Camera Permission & Start Stream ---
  const startCamera = useCallback(async () => {
     console.log("Attempting to start camera in Diary Form...");
     setCameraError(null);
     setPhotoPreview(null);
     setAnalysisResult(null);
     setAnalysisError(null);
     setCameraStatus('permission-pending');
     setShowCameraView(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API (getUserMedia) not supported or available.');
        setCameraError('A API da câmera não é suportada neste navegador ou ambiente.');
        setCameraStatus('error');
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      console.log("Camera permission granted (environment facing).");
      streamRef.current = stream;

       if (videoRef.current) {
           videoRef.current.srcObject = stream;
           console.log("Video stream attached.");
           try {
                await videoRef.current.play();
                console.log("Video play initiated.");
                setCameraStatus('streaming');
           } catch (playError) {
               console.error("Error trying to play video:", playError);
               setCameraError("Falha ao iniciar o vídeo da câmera.");
               setCameraStatus('error');
               stopMediaStream();
           }
       } else {
           console.warn("Video ref not available when stream was ready.");
           setCameraStatus('error');
           setCameraError('Falha ao configurar a visualização da câmera.');
           stopMediaStream();
       }

    } catch (error) {
       console.warn('Error accessing environment camera, trying default:', error);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Camera permission granted (default).");
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                console.log("Video stream attached (default).");
                 try {
                    await videoRef.current.play();
                    console.log("Video play initiated (default).");
                    setCameraStatus('streaming');
                 } catch (playError) {
                    console.error("Error trying to play default video:", playError);
                    setCameraError("Falha ao iniciar o vídeo da câmera padrão.");
                    setCameraStatus('error');
                    stopMediaStream();
                 }
            } else {
               console.warn("Video ref not available when default stream was ready.");
               setCameraStatus('error');
               setCameraError('Falha ao configurar a visualização da câmera padrão.');
               stopMediaStream();
           }
        } catch (finalError) {
            console.error('Error accessing any camera:', finalError);
            let errorMsg = 'Permissão da câmera negada. Habilite nas configurações do navegador.';
            if (finalError instanceof Error) {
                if (finalError.name === 'NotAllowedError') {
                    errorMsg = 'Permissão da câmera negada pelo usuário.';
                } else if (finalError.name === 'NotFoundError') {
                    errorMsg = 'Nenhuma câmera encontrada ou compatível.';
                } else if (finalError.name === 'NotReadableError' || finalError.name === 'OverconstrainedError') {
                    errorMsg = 'Câmera já em uso ou não pode ser lida.';
                } else {
                    errorMsg = `Erro ao acessar câmera: ${finalError.message}`;
                }
            }
            setCameraError(errorMsg);
            setCameraStatus('permission-denied');
            toast({
                variant: 'destructive',
                title: 'Erro de Câmera',
                description: errorMsg,
            });
            stopMediaStream();
        }
    }
  }, [stopMediaStream, toast]);


  // --- Capture Photo Logic ---
  const capturePhoto = useCallback(() => {
    if (cameraStatus !== 'streaming' || !videoRef.current || !canvasRef.current) {
      console.warn("Cannot capture photo, camera not ready or refs missing.");
      toast({ variant: "destructive", title: "Erro", description: "Câmera não está pronta para capturar." });
      return;
    }

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const context = canvasElement.getContext('2d');

    if (!context) {
      console.error("Failed to get canvas context.");
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível processar a imagem." });
      return;
    }

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    // Use JPEG for potentially smaller size, adjust quality (0.9 = 90%)
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);

    setPhotoPreview(dataUrl);
    console.log("Photo captured successfully.");
    toast({ title: "Foto Capturada!", description: "Você pode analisar ou salvar a entrada." });
    stopMediaStream();
    setShowCameraView(false);

  }, [cameraStatus, toast, stopMediaStream]);


  // Cleanup stream on component unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, [stopMediaStream]);


  // --- AI Analysis ---
  const handleAnalyzePhoto = async () => {
    if (!photoPreview) {
        toast({
            variant: "destructive",
            title: "Nenhuma Foto",
            description: "Capture uma foto antes de analisar.",
        });
        return;
    }
     if (firebaseInitializationError) {
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Serviço de análise indisponível devido a erro do Firebase.' });
        return;
     }


    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
       if (typeof photoPreview !== 'string' || !photoPreview.startsWith('data:image')) {
         throw new Error('Dados de imagem inválidos para análise.');
       }
       console.log("Sending photo for analysis...");
       const result = await analyzePlantPhoto({ photoDataUri: photoPreview });
       console.log("Analysis result received:", result);
       setAnalysisResult(result);
       toast({
           title: "Análise Concluída",
           description: "A IA analisou a foto.",
           variant: "default",
       });
    } catch (error) {
      console.error('Erro na Análise de IA:', error);
      const errorMsg = `Falha ao analisar a foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      setAnalysisError(errorMsg);
      toast({
          variant: "destructive",
          title: "Erro na Análise",
          description: errorMsg,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Form Submission ---
  const onSubmit = async (data: DiaryEntryFormData) => {
     setIsSubmitting(true);
     setSubmitError(null);

     // Check for Firebase initialization errors before proceeding
     if (firebaseInitializationError) {
         console.error("Firebase initialization error:", firebaseInitializationError);
         setSubmitError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível salvar.`);
         toast({
             variant: 'destructive',
             title: 'Erro de Configuração',
             description: 'Não foi possível conectar ao banco de dados. Verifique as configurações do Firebase.',
         });
         setIsSubmitting(false);
         return;
     }

    const currentAuthorId = GUEST_AUTHOR_ID;
    console.log('Iniciando envio para Firestore:', data, 'by User:', currentAuthorId);

    try {
        const photoUrlForStorage = photoPreview; // Store data URI for now

        // Prepare data, excluding the ID field for Firestore's addDoc
        const newEntryData: Omit<DiaryEntry, 'id'> = {
            plantId: plantId,
            timestamp: new Date().toISOString(), // Use current time as ISO string
            authorId: currentAuthorId,
            note: data.note,
            stage: data.stage || null,
            heightCm: data.heightCm ?? null,
            ec: data.ec ?? null,
            ph: data.ph ?? null,
            temp: data.temp ?? null,
            humidity: data.humidity ?? null,
            // CONSIDERATION: Store large data URIs? Better to upload to Firebase Storage
            // and store the URL. For now, storing the data URI directly.
            photoUrl: photoUrlForStorage,
            aiSummary: analysisResult?.analysisResult || null,
        };

        console.log('Novo objeto de entrada para Firestore:', newEntryData);

        // Call Firestore service function
        const savedEntry = await addDiaryEntryToFirestore(plantId, newEntryData);
        console.log('Entrada adicionada ao Firestore com ID:', savedEntry.id);

        // Call the callback prop with the full entry object (including the new ID)
        onNewEntry(savedEntry);
        console.log('Callback onNewEntry chamado com a entrada salva.');

         toast({
           title: "Entrada Salva",
           description: "Sua entrada no diário foi adicionada com sucesso.",
           variant: "default",
         });

        form.reset();
        setPhotoPreview(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        console.log('Formulário e estados resetados.');

    } catch (error: any) {
        console.error('Erro ao salvar entrada no Firestore:', error);
        const errorMsg = `Falha ao salvar a entrada do diário: ${error.message || 'Erro desconhecido'}`;
        setSubmitError(errorMsg);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: errorMsg,
        });
    } finally {
        setIsSubmitting(false);
        console.log('Finalizado o processo de envio.');
    }
  };


  return (
    <Card className="shadow-lg border border-primary/10 card">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl flex items-center gap-2">
            <Leaf className="text-primary h-6 w-6" /> Adicionar Nova Entrada no Diário
        </CardTitle>
        <CardDescription>Registre observações, medições e adicione uma foto para análise pela IA.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

             {/* Firebase Init Error Display */}
              {firebaseInitializationError && (
                 <Alert variant="destructive" className="p-3">
                   <AlertCircle className="h-4 w-4"/>
                   <AlertTitle>Erro de Configuração do Firebase</AlertTitle>
                   <AlertDescription className="text-sm">{firebaseInitializationError.message}. Não é possível salvar entradas.</AlertDescription>
                 </Alert>
              )}


            {/* Note Section First */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Observações / Notas</FormLabel>
                  <FormControl>
                    <Textarea
                       placeholder="Descreva o que você vê, ações tomadas, ou qualquer detalhe relevante..." {...field}
                       disabled={isDisabled}
                       rows={4}
                       className="textarea"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Measurement Fields */}
             <Card className="bg-muted/30 border border-border/50 p-4">
                 <Label className="text-base font-medium mb-3 block">Medições (Opcional)</Label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
                     <FormField
                       control={form.control}
                       name="stage"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Estágio</FormLabel>
                           <FormControl>
                             <Input placeholder="ex: Floração S3" {...field} disabled={isDisabled} className="input"/>
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                    <FormField
                        control={form.control}
                        name="heightCm"
                        render={({ field }) => (
                           <FormItem>
                             <FormLabel>Altura (cm)</FormLabel>
                             <FormControl>
                                <Input type="number" step="0.1" placeholder="ex: 45.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isDisabled} className="input"/>
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                        )}
                     />
                     <FormField
                         control={form.control}
                         name="ec"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>EC</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 1.6" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isDisabled} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                     <FormField
                         control={form.control}
                         name="ph"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>pH</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 6.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isDisabled} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                     <FormField
                         control={form.control}
                         name="temp"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Temp (°C)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="0.1" placeholder="ex: 24.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isDisabled} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                     <FormField
                         control={form.control}
                         name="humidity"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Umidade (%)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="1" placeholder="ex: 55" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isDisabled} className="input"/>
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                 </div>
             </Card>


            {/* Photo Section - Updated for Camera */}
             <Card className="bg-muted/30 border border-border/50 p-4">
                 <Label className="text-base font-medium mb-3 block">Foto da Planta (Opcional)</Label>
                <div className="flex flex-col md:flex-row items-start gap-4">
                     {/* Camera/Preview Area */}
                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center border-2 border-dashed border-secondary/30 rounded-lg p-2 text-center bg-background transition-colors aspect-video md:aspect-auto md:h-auto min-h-[200px] relative overflow-hidden">
                         <canvas ref={canvasRef} className="hidden"></canvas>

                        {showCameraView && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                                <video
                                    ref={videoRef}
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${cameraStatus === 'streaming' ? 'opacity-100' : 'opacity-0'}`}
                                    playsInline
                                    muted
                                    autoPlay
                                />
                                {cameraStatus === 'permission-pending' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                                        <Loader2 className="h-10 w-10 animate-spin mb-3" />
                                        <p className="font-semibold">Aguardando permissão...</p>
                                    </div>
                                )}
                                {cameraStatus === 'permission-denied' && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                                         <VideoOff className="h-10 w-10 text-destructive mb-3" />
                                         <p className="font-semibold text-destructive">Acesso negado</p>
                                         <p className="text-sm text-center mt-1">{cameraError || "Permissão da câmera negada."}</p>
                                          <Button variant="secondary" size="sm" className="mt-4 button" onClick={startCamera} disabled={isDisabled}>Tentar Novamente</Button>
                                     </div>
                                )}
                                 {cameraStatus === 'error' && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 z-10">
                                         <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                                         <p className="font-semibold text-destructive">Erro na câmera</p>
                                         <p className="text-sm text-center mt-1">{cameraError || "Não foi possível iniciar a câmera."}</p>
                                          <Button variant="secondary" size="sm" className="mt-4 button" onClick={startCamera} disabled={isDisabled}>Tentar Novamente</Button>
                                     </div>
                                )}
                            </div>
                        )}

                        {!showCameraView && photoPreview && (
                             <div className="relative group w-full h-full flex items-center justify-center">
                                <Image
                                  data-ai-hint="cannabis plant user upload close up"
                                  src={photoPreview}
                                  alt="Pré-visualização da planta"
                                  layout="fill"
                                  objectFit="contain"
                                  className="rounded-md shadow-md"
                                />
                                <Button
                                     variant="outline"
                                     size="sm"
                                     className="absolute bottom-2 right-2 z-10 opacity-80 hover:opacity-100 button"
                                     onClick={() => { setPhotoPreview(null); startCamera(); }}
                                     disabled={isDisabled}
                                >
                                     <RefreshCw className="mr-2 h-4 w-4" /> Retirar Foto
                                </Button>
                             </div>
                        )}

                        {!showCameraView && !photoPreview && (
                           <div className="flex flex-col items-center text-muted-foreground p-4">
                                <Camera className="h-12 w-12 mb-3 text-secondary/50" />
                                <span className="text-sm font-medium">Adicionar Foto</span>
                                <span className="text-xs mt-1 text-center">Clique abaixo para ativar a câmera e capturar uma imagem.</span>
                                 <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     className="mt-4 button"
                                     onClick={startCamera}
                                     disabled={isDisabled || cameraStatus === 'permission-pending'}
                                   >
                                     <Camera className="mr-2 h-4 w-4" /> Abrir Câmera
                                </Button>
                           </div>
                        )}

                        {showCameraView && cameraStatus === 'streaming' && (
                             <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
                                <Button
                                     type="button"
                                     variant="destructive"
                                     size="icon"
                                     className="rounded-full h-12 w-12 shadow-lg button"
                                     onClick={() => { stopMediaStream(); setShowCameraView(false); }}
                                     disabled={isDisabled}
                                     aria-label="Cancelar Câmera"
                                >
                                     <XCircle className="h-6 w-6" />
                                </Button>
                                <Button
                                     type="button"
                                     variant="default"
                                     size="icon"
                                     className="rounded-full h-16 w-16 shadow-lg button border-4 border-background"
                                     onClick={capturePhoto}
                                     disabled={isDisabled}
                                     aria-label="Capturar Foto"
                                >
                                     <Camera className="h-7 w-7" />
                                </Button>
                             </div>
                        )}
                     </div>


                     {/* Analysis Area */}
                     <div className="w-full md:w-1/2 space-y-3">
                         <Button
                           type="button"
                           onClick={handleAnalyzePhoto}
                           disabled={!photoPreview || isDisabled}
                           variant="secondary"
                           className="w-full button"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com IA...
                              </>
                            ) : (
                              <>
                                <Bot className="mr-2 h-4 w-4" /> Analisar Foto com IA
                              </>
                            )}
                         </Button>
                         {analysisResult && (
                           <Card className="bg-accent/10 border-accent p-3 shadow-sm">
                             <CardHeader className="p-0 mb-1">
                               <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-accent-foreground">
                                 <Bot className="h-4 w-4"/> Resultado da Análise IA
                               </CardTitle>
                             </CardHeader>
                             <CardContent className="p-0">
                                <p className="text-sm text-accent-foreground/90">{analysisResult.analysisResult}</p>
                             </CardContent>
                           </Card>
                         )}
                         {analysisError && (
                            <Alert variant="destructive" className="text-xs p-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro na Análise</AlertTitle>
                                <AlertDescription>{analysisError}</AlertDescription>
                           </Alert>
                         )}
                     </div>
                </div>
            </Card>


            {/* Submission Area */}
            <div className="pt-4 space-y-3">
                 {submitError && !firebaseInitializationError && ( // Only show submit error if no init error
                    <Alert variant="destructive" className="p-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Erro ao Salvar</AlertTitle>
                      <AlertDescription className="text-sm">{submitError}</AlertDescription>
                     </Alert>
                 )}

                <Button type="submit" size="lg" className="w-full font-semibold button" disabled={isDisabled}>
                   {isSubmitting ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando Entrada...
                     </>
                   ) : (
                     'Salvar Entrada no Diário'
                   )}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

```
    </content>
  </change>
  <change>
    <file>src/components/dashboard/attention-plants.tsx</file>
    <description>Update AttentionPlants component to link using plant.id (assuming qrCode===id).</description>
    <content><![CDATA[
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Plant } from '@/services/plant-id'; // Import the base Plant type

// This component receives the full Plant object now
interface AttentionPlantsProps {
  plants: Plant[];
}

export default function AttentionPlants({ plants }: AttentionPlantsProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 card border-destructive/30"> {/* Destructive border hint */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-xl">Requer Atenção</CardTitle>
        </div>
      </CardHeader>
      <CardDescription className="px-6 pb-4 text-muted-foreground">
          Plantas que podem precisar de intervenção ou cuidados especiais.
      </CardDescription>
      <CardContent className="space-y-4 pt-0">
        {plants.length === 0 ? (
           <Alert variant="default" className="border-primary/20 bg-primary/5"> {/* Use default, maybe slightly styled */}
             <AlertTriangle className="h-4 w-4 text-primary" /> {/* Use primary color for positive sign */}
             <AlertTitle>Tudo Certo!</AlertTitle>
             <AlertDescription>
               Nenhuma planta parece precisar de atenção especial no momento.
             </AlertDescription>
           </Alert>
        ) : (
          <ul className="divide-y divide-border">
            {plants.map((plant) => {
              // Derive attention reason and last updated from plant data here
              const attentionReason = `Status: ${plant.status}`; // Simple reason
              // Using birthDate as a proxy for last updated date in this simplified version
               const lastUpdated = `Cadastrada em: ${plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('pt-BR') : (plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A')}`;


              return (
                <li key={plant.id} className="py-3 group hover:bg-destructive/5 rounded-md transition-colors duration-150">
                  {/* Ensure Link points to the correct plant page using plant.id */}
                  <Link href={`/plant/${plant.id}`} className="flex items-center space-x-4 px-2">
                     <div className="flex-shrink-0">
                      <Image
                        // Updated hint to be more specific for AI search
                        data-ai-hint={`cannabis plant ${plant.status.toLowerCase().replace(/ /g, '-')}`}
                        // Updated placeholder seed
                        src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-problem-${plant.id}/100/100`}
                        alt={`Foto de ${plant.strain} precisando de atenção (${attentionReason})`}
                        width={50}
                        height={50}
                        className="rounded-md object-cover border border-destructive/50 aspect-square" // Destructive hint on border
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                       <p className="text-sm text-destructive font-medium truncate">{attentionReason}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                         {/* Use destructive badge for attention status */}
                         <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                         <span>·</span>
                         <span>{lastUpdated}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {/* Footer Link to the new /plants page with a filter hint */}
       {plants.length > 0 && (
           <div className="p-4 border-t mt-auto text-center">
              <Button variant="link" size="sm" asChild className="text-destructive hover:text-destructive/80">
                 {/* Link to the main plants page; filtering logic is client-side in /plants page */}
                 <Link href="/plants">Ver todas as plantas com atenção</Link>
              </Button>
           </div>
        )}
    </Card>
  );
}

```
    </content>
  </change>
  <change>
    <file>src/components/dashboard/recent-plants.tsx</file>
    <description>Update RecentPlants component to link using plant.id (assuming qrCode===id).</description>
    <content><![CDATA[
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Plant } from '@/services/plant-id'; // Import the base Plant type

// This component receives the full Plant object array now
interface RecentPlantsProps {
  plants: Plant[];
}

export default function RecentPlants({ plants }: RecentPlantsProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 card h-full flex flex-col"> {/* Flex column for structure */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Plantas Recentes</CardTitle>
        </div>
      </CardHeader>
      <CardDescription className="px-6 pb-4 text-muted-foreground">
          Plantas com cadastro mais recente.
      </CardDescription>
      <CardContent className="flex-1 overflow-y-auto space-y-4 pt-0"> {/* Allow scrolling and space items */}
        {plants.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhuma planta cadastrada ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {plants.map((plant) => {
               // Using createdAt or birthDate for display
                const lastUpdated = `Cadastrada em: ${plant.createdAt ? new Date(plant.createdAt).toLocaleDateString('pt-BR') : (plant.birthDate ? new Date(plant.birthDate).toLocaleDateString('pt-BR') : 'N/A')}`;


               return (
                 <li key={plant.id} className="py-3 group hover:bg-muted/30 rounded-md transition-colors duration-150">
                   {/* Ensure Link points to the correct plant page using plant.id */}
                   <Link href={`/plant/${plant.id}`} className="flex items-center space-x-4 px-2">
                     <div className="flex-shrink-0">
                       <Image
                         // Make hint more specific using plant status
                         data-ai-hint={`cannabis plant ${plant.status.toLowerCase()}`}
                         // Generate placeholder seed based on status for relevance
                         src={`https://picsum.photos/seed/cannabis-${plant.status.toLowerCase().replace(/ /g, '-')}-${plant.id}/100/100`}
                         alt={`Foto de ${plant.strain} (${plant.status})`}
                         width={50}
                         height={50}
                         className="rounded-md object-cover border border-border/50 aspect-square"
                       />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-base font-medium text-foreground truncate">{plant.strain}</p>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {/* Badge remains secondary for general status */}
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{plant.status}</Badge>
                          <span>·</span>
                          <span>{lastUpdated}</span>
                       </div>
                     </div>
                     <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                   </Link>
                 </li>
               );
            })}
          </ul>
        )}
      </CardContent>
       {/* Footer Link to the new /plants page */}
       {plants.length > 0 && (
          <div className="p-4 border-t mt-auto text-center">
              <Button variant="link" size="sm" asChild>
                 <Link href="/plants">Ver todas as plantas</Link>
              </Button>
          </div>
       )}
    </Card>
  );
}

```
    </content>
  </change>
  <change>
    <file>src/app/login/page.tsx</file>
    <description>Temporarily redirect login page to home page as login is disabled.</description>
    <content><![CDATA[
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect immediately on mount
    console.log("Login page accessed, redirecting to home (login disabled)...");
    router.replace('/'); // Use replace to avoid adding login to history
  }, [router]);

  // Render a loading/redirecting state while the redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md text-center shadow-lg card p-6">
        <CardHeader>
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <CardTitle>Redirecionando...</CardTitle>
          <CardDescription>O login está temporariamente desabilitado.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Você será redirecionado para a página inicial.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Original Login Page Code (kept for reference, but not used due to redirect)
/*
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config';
import Image from 'next/image';

// Schema for email/password login
const loginSchema = z.object({
  email: z.string().email('Por favor, insira um email válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });


  // --- Email/Password Login Handler ---
  const onEmailSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    setLoginError(null);

    if (firebaseInitializationError) {
        console.error("Firebase initialization error:", firebaseInitializationError);
        setLoginError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível fazer login.`);
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível conectar ao serviço de autenticação.' });
        setIsLoading(false);
        return;
    }

    if (!auth) {
         setLoginError("Serviço de autenticação não está pronto. Tente novamente em breve.");
         toast({ variant: 'destructive', title: 'Erro Interno', description: 'Auth não inicializado.' });
         setIsLoading(false);
         return;
     }

    try {
      console.log('Attempting email login for:', data.email);
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('Email login successful for:', userCredential.user.email);
      toast({
        title: 'Login Bem-sucedido!',
        description: `Bem-vindo de volta, ${userCredential.user.email}!`,
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard after login
    } catch (error: any) {
      console.error('Email login failed:', error);
      let errorMessage = 'Falha no login. Verifique seu email e senha.';
      if (error.code) {
          switch (error.code) {
              case 'auth/user-not-found':
              case 'auth/wrong-password':
                  errorMessage = 'Email ou senha incorretos.';
                  break;
              case 'auth/invalid-email':
                  errorMessage = 'Formato de email inválido.';
                  break;
              case 'auth/invalid-credential':
                   errorMessage = 'Credenciais inválidas ou usuário não encontrado.';
                   break;
              default:
                  errorMessage = `Erro de login: ${error.message}`;
          }
      }
      setLoginError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Falha no Login',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Social Login Handler ---
   const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'twitter') => {
       setIsLoading(true);
       setLoginError(null);

       if (firebaseInitializationError) {
           console.error("Firebase initialization error:", firebaseInitializationError);
           setLoginError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível fazer login.`);
           toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível conectar ao serviço de autenticação.' });
           setIsLoading(false);
           return;
       }
        if (!auth) {
            setLoginError("Serviço de autenticação não está pronto. Tente novamente em breve.");
            toast({ variant: 'destructive', title: 'Erro Interno', description: 'Auth não inicializado.' });
            setIsLoading(false);
            return;
        }


       let provider;
       let providerName = '';

       try {
           switch (providerType) {
               case 'google':
                   provider = new GoogleAuthProvider();
                   providerName = 'Google';
                   break;
               // Add Facebook and Twitter providers here if needed
               // case 'facebook':
               //   provider = new OAuthProvider('facebook.com'); // Requires enabling in Firebase Console
               //   providerName = 'Facebook';
               //   break;
               // case 'twitter':
               //   provider = new OAuthProvider('twitter.com'); // Requires enabling in Firebase Console
               //   providerName = 'X (Twitter)';
               //   break;
               default:
                   throw new Error('Provedor social não suportado.');
           }

           console.log(`Attempting signInWithPopup for ${providerName}...`);
            // Ensure auth is still valid right before the call
            if (!auth) {
               throw new Error("Auth instance became null before signInWithPopup call.");
            }
           const result = await signInWithPopup(auth, provider); // This is the line that often throws auth/argument-error
           const user = result.user;
           console.log(`${providerName} login successful. User:`, user.email, user.uid);
           toast({
               title: `Login com ${providerName} bem-sucedido!`,
               description: `Bem-vindo, ${user.displayName || user.email}!`,
               variant: 'default',
           });
           router.push('/'); // Redirect to dashboard
       } catch (error: any) {
           console.error(`${providerName} login failed:`, error);
            let errorMessage = `Falha no login com ${providerName}.`;
            if (error.code) {
               switch (error.code) {
                   case 'auth/account-exists-with-different-credential':
                       errorMessage = 'Já existe uma conta com este email usando um método de login diferente.';
                       break;
                   case 'auth/popup-closed-by-user':
                       errorMessage = 'Janela de login fechada antes da conclusão.';
                       break;
                   case 'auth/cancelled-popup-request':
                        errorMessage = 'Múltiplas tentativas de login. Por favor, tente novamente.';
                        break;
                    case 'auth/popup-blocked':
                        errorMessage = 'O popup de login foi bloqueado pelo navegador. Por favor, habilite popups para este site.';
                        break;
                   case 'auth/argument-error':
                       errorMessage = `Erro de configuração do provedor ${providerName}. Verifique as configurações no Firebase Console. (auth/argument-error)`;
                       console.error("Detail: This often means the provider (Google, etc.) isn't correctly configured or enabled in your Firebase project's Authentication settings.");
                       break;
                    case 'auth/operation-not-allowed':
                         errorMessage = `Login com ${providerName} não está habilitado no projeto Firebase.`;
                         break;
                   default:
                       errorMessage = `Erro de login com ${providerName}: ${error.message}`;
               }
           }
            setLoginError(errorMessage);
           toast({
               variant: 'destructive',
               title: `Falha no Login com ${providerName}`,
               description: errorMessage,
           });
       } finally {
           setIsLoading(false);
       }
   };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md shadow-xl border-primary/20 card">
        <CardHeader className="text-center">
           <Image
               src="/budscan-logo.png"
               alt="BudScan Logo"
               width={180}
               height={51}
               priority
               className="mx-auto mb-4"
           />
          <CardTitle className="text-2xl font-bold text-primary">Bem-vindo de volta!</CardTitle>
          <CardDescription>Faça login para acessar seu painel BudScan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {firebaseInitializationError && (
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Erro de Configuração</AlertTitle>
                     <AlertDescription>
                         {firebaseInitializationError.message}. A autenticação pode não funcionar.
                     </AlertDescription>
                 </Alert>
             )}

          <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                {...register('email')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-secondary" />Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                {...register('password')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                 aria-invalid={errors.password ? "true" : "false"}
              />
               {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {loginError && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{loginError}</p>
            )}

            <Button type="submit" className="w-full font-semibold button" disabled={isLoading || !!firebaseInitializationError}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Entrar
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading || !!firebaseInitializationError}
              className="button justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.33-2.83-6.33-6.33s2.93-6.33 6.33-6.33c1.9 0 3.21.73 4.18 1.69l2.6-2.6C16.84 3.18 14.91 2 12.48 2 7.48 2 3.11 6.33 3.11 11.33s4.37 9.33 9.37 9.33c3.19 0 5.64-1.18 7.57-3.01 2-1.9 2.6-4.5 2.6-6.66 0-.58-.05-1.14-.13-1.67z"></path></svg>}
              Google
            </Button>
            {/* Placeholder for other social logins
             <Button variant="outline" onClick={() => handleSocialLogin('facebook')} disabled={isLoading || !!firebaseInitializationError} className="button justify-center gap-2">
               {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg>...</svg>}
               Facebook
             </Button>
             <Button variant="outline" onClick={() => handleSocialLogin('twitter')} disabled={isLoading || !!firebaseInitializationError} className="button justify-center gap-2">
               {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg>...</svg>}
               X (Twitter)
             </Button>
             */}
          </div>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground justify-center">
          Não tem uma conta?{' '}
          <Button variant="link" className="p-0 pl-1 h-auto text-primary" asChild>
            <Link href="/signup">Cadastre-se</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
*/
```
    </content>
  </change>
  <change>
    <file>src/app/signup/page.tsx</file>
    <description>Temporarily redirect signup page to home page as signup is disabled.</description>
    <content><![CDATA[
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SignupPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect immediately on mount
    console.log("Signup page accessed, redirecting to home (signup disabled)...");
    router.replace('/'); // Use replace to avoid adding signup to history
  }, [router]);

  // Render a loading/redirecting state while the redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md text-center shadow-lg card p-6">
         <CardHeader>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
           <CardTitle>Redirecionando...</CardTitle>
           <CardDescription>O cadastro está temporariamente desabilitado.</CardDescription>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">Você será redirecionado para a página inicial.</p>
         </CardContent>
       </Card>
    </div>
  );
}

// Original Signup Page Code (kept for reference, but not used due to redirect)
/*
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config';
import Image from 'next/image';

// Schema for signup form
const signupSchema = z.object({
  email: z.string().email('Por favor, insira um email válido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'], // Error path for password confirmation
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  // --- Email/Password Signup Handler ---
  const onEmailSubmit = async (data: SignupFormInputs) => {
    setIsLoading(true);
    setSignupError(null);

    if (firebaseInitializationError) {
        console.error("Firebase initialization error:", firebaseInitializationError);
        setSignupError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível registrar.`);
        toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível conectar ao serviço de autenticação.' });
        setIsLoading(false);
        return;
    }
     if (!auth) {
         setSignupError("Serviço de autenticação não está pronto. Tente novamente em breve.");
         toast({ variant: 'destructive', title: 'Erro Interno', description: 'Auth não inicializado.' });
         setIsLoading(false);
         return;
     }

    try {
      console.log('Attempting email signup for:', data.email);
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log('Email signup successful for:', user.email, 'UID:', user.uid);
      toast({
        title: 'Cadastro Realizado!',
        description: `Sua conta foi criada com sucesso. Bem-vindo!`,
        variant: 'default',
      });
      router.push('/'); // Redirect to dashboard after signup
    } catch (error: any) {
      console.error('Email signup failed:', error);
      let errorMessage = 'Falha no cadastro. Tente novamente.';
      if (error.code) {
          switch (error.code) {
              case 'auth/email-already-in-use':
                  errorMessage = 'Este email já está em uso por outra conta.';
                  break;
              case 'auth/invalid-email':
                  errorMessage = 'Formato de email inválido.';
                  break;
              case 'auth/weak-password':
                  errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                  break;
              default:
                  errorMessage = `Erro de cadastro: ${error.message}`;
          }
      }
      setSignupError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

   // --- Social Login/Signup Handler ---
   // Same handler as login page, Firebase handles linking or creation automatically
   const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'twitter') => {
      setIsLoading(true);
      setSignupError(null);

      if (firebaseInitializationError) {
          console.error("Firebase initialization error:", firebaseInitializationError);
          setSignupError(`Erro de configuração do Firebase: ${firebaseInitializationError.message}. Não é possível registrar.`);
          toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Não foi possível conectar ao serviço de autenticação.' });
          setIsLoading(false);
          return;
      }
       if (!auth) {
           setSignupError("Serviço de autenticação não está pronto. Tente novamente em breve.");
           toast({ variant: 'destructive', title: 'Erro Interno', description: 'Auth não inicializado.' });
           setIsLoading(false);
           return;
       }

      let provider;
      let providerName = '';

      try {
          switch (providerType) {
              case 'google':
                  provider = new GoogleAuthProvider();
                  providerName = 'Google';
                  break;
              // Add Facebook and Twitter providers here if needed
              // case 'facebook': provider = new OAuthProvider('facebook.com'); providerName = 'Facebook'; break;
              // case 'twitter': provider = new OAuthProvider('twitter.com'); providerName = 'X (Twitter)'; break;
              default:
                  throw new Error('Provedor social não suportado.');
          }

          console.log(`Attempting signInWithPopup for ${providerName} (Signup/Login)...`);
           if (!auth) { // Re-check auth right before use
              throw new Error("Auth instance became null before signInWithPopup call.");
           }
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          console.log(`${providerName} signup/login successful. User:`, user.email, user.uid);
          toast({
              title: `Login/Cadastro com ${providerName} bem-sucedido!`,
              description: `Bem-vindo, ${user.displayName || user.email}!`,
              variant: 'default',
          });
          router.push('/'); // Redirect to dashboard
      } catch (error: any) {
          console.error(`${providerName} signup/login failed:`, error);
           let errorMessage = `Falha no login/cadastro com ${providerName}.`;
           if (error.code) {
              // Reuse error handling from login page
               switch (error.code) {
                   case 'auth/account-exists-with-different-credential':
                       errorMessage = 'Já existe uma conta com este email usando um método de login diferente.';
                       break;
                   case 'auth/popup-closed-by-user':
                       errorMessage = 'Janela de login fechada antes da conclusão.';
                       break;
                   case 'auth/cancelled-popup-request':
                        errorMessage = 'Múltiplas tentativas de login. Por favor, tente novamente.';
                        break;
                   case 'auth/popup-blocked':
                       errorMessage = 'O popup de login foi bloqueado pelo navegador. Por favor, habilite popups para este site.';
                       break;
                   case 'auth/argument-error':
                       errorMessage = `Erro de configuração do provedor ${providerName}. Verifique as configurações no Firebase Console. (auth/argument-error)`;
                       break;
                   case 'auth/operation-not-allowed':
                        errorMessage = `Login com ${providerName} não está habilitado no projeto Firebase.`;
                        break;
                   default:
                       errorMessage = `Erro de login/cadastro com ${providerName}: ${error.message}`;
               }
           }
           setSignupError(errorMessage);
          toast({
              variant: 'destructive',
              title: `Falha no Login/Cadastro com ${providerName}`,
              description: errorMessage,
          });
      } finally {
          setIsLoading(false);
      }
   };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/50 to-primary/10">
      <Card className="w-full max-w-md shadow-xl border-primary/20 card">
        <CardHeader className="text-center">
           <Image
                src="/budscan-logo.png"
                alt="BudScan Logo"
                width={180}
                height={51}
                priority
                className="mx-auto mb-4"
           />
          <CardTitle className="text-2xl font-bold text-primary">Crie sua Conta BudScan</CardTitle>
          <CardDescription>Cadastre-se para começar a monitorar suas plantas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             {firebaseInitializationError && (
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Erro de Configuração</AlertTitle>
                     <AlertDescription>
                         {firebaseInitializationError.message}. A autenticação pode não funcionar.
                     </AlertDescription>
                 </Alert>
             )}

          <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup" className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-secondary" />Email</Label>
              <Input
                id="email-signup"
                type="email"
                placeholder="seuemail@exemplo.com"
                {...register('email')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-signup" className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-secondary" />Senha</Label>
              <Input
                id="password-signup"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register('password')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.password ? "true" : "false"}
              />
               {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword-signup" className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-secondary" />Confirmar Senha</Label>
              <Input
                id="confirmPassword-signup"
                type="password"
                placeholder="Repita a senha"
                {...register('confirmPassword')}
                disabled={isLoading || !!firebaseInitializationError}
                className={`input ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : ''}`}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
               {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            {signupError && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{signupError}</p>
            )}

            <Button type="submit" className="w-full font-semibold button" disabled={isLoading || !!firebaseInitializationError}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Cadastrar com Email
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou cadastre-se com</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading || !!firebaseInitializationError}
              className="button justify-center gap-2"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <svg role="img" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.33-2.83-6.33-6.33s2.93-6.33 6.33-6.33c1.9 0 3.21.73 4.18 1.69l2.6-2.6C16.84 3.18 14.91 2 12.48 2 7.48 2 3.11 6.33 3.11 11.33s4.37 9.33 9.37 9.33c3.19 0 5.64-1.18 7.57-3.01 2-1.9 2.6-4.5 2.6-6.66 0-.58-.05-1.14-.13-1.67z"></path></svg>}
              Google
            </Button>
            {/* Placeholder for other social logins */
          </div>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground justify-center">
          Já tem uma conta?{' '}
          <Button variant="link" className="p-0 pl-1 h-auto text-primary" asChild>
            <Link href="/login">Faça login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
*/
```
    </content>
  </change>
  <change>
    <file>src/app/layout.tsx</file>
    <description>Remove AuthProvider wrapper as login is disabled.</description>
    <content><![CDATA[
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter or Geist as preferred
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import AppHeader from '@/components/app-header'; // Import the new AppHeader
// Removed Geist Sans import as Inter is used
// import { GeistSans } from 'geist/font/sans';
// Removed AuthProvider import
// import { AuthProvider } from '@/context/auth-context';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BudScan', // Updated title
  description: 'Diário e Análise Inteligente de Plantas', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Set lang to pt-BR. Dark theme is applied via globals.css :root and .dark selectors
    <html lang="pt-BR" suppressHydrationWarning>
      {/* No whitespace or comments directly inside <html> */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Default to dark theme
            enableSystem
            disableTransitionOnChange
        >
            {/* Removed AuthProvider wrapper */}
            <div className="relative flex min-h-screen flex-col">
              <AppHeader /> {/* Render header unconditionally */}
              {/* Main content */}
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```
    </content>
  </change>
  <change>
    <file>src/components/app-header.tsx</file>
    <description>Remove user-related elements (login/signup buttons, avatar) from the header as login is disabled.</description>
    <content><![CDATA[ // src/components/app-header.tsx
 'use client';

 import React from 'react';
 import Link from 'next/link';
 import Image from 'next/image'; // Import Image component
 import ThemeToggle from '@/components/theme-toggle';
 // Removed Sprout icon as we're using an image logo now
 // import { Sprout } from 'lucide-react';
 // Remove user-related imports
 // import { Button } from '@/components/ui/button';
 // import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 // import { LogIn, UserPlus, LogOut } from 'lucide-react';
 // import { useAuth } from '@/context/auth-context';
 // import {
 //   DropdownMenu,
 //   DropdownMenuContent,
 //   DropdownMenuItem,
 //   DropdownMenuLabel,
 //   DropdownMenuSeparator,
 //   DropdownMenuTrigger,
 // } from '@/components/ui/dropdown-menu';


 export default function AppHeader() {
   // Remove auth context usage
   // const { user, loading, logout } = useAuth();

   return (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
       <div className="container flex h-16 items-center justify-between"> {/* Increased height for logo */}
         {/* Logo/Brand - Use Image component */}
         <Link href="/" className="flex items-center mr-6">
           {/* Use Next Image for optimization */}
           {/* Ensure budscan-logo.png exists in the /public folder */}
           <Image
               src="/budscan-logo.png" // Path to the logo in the public folder - CONFIRMED PATH USAGE
               alt="BudScan Logo"
               width={140} // Adjust width as needed
               height={40} // Adjust height as needed
               priority // Load the logo quickly
               className="h-8 md:h-10 w-auto" // Responsive height
           />
           {/* Remove text span */}
           {/* <Sprout className="h-6 w-6 text-primary" />
           <span className="font-bold text-primary tracking-tight hidden sm:inline-block">CannaLog</span> */}
         </Link>

         {/* Right side actions */}
         <div className="flex items-center gap-3">
           <ThemeToggle />
           {/* Remove all conditional rendering based on user */}
         </div>
       </div>
     </header>
   );
 }

```
    </content>
  </change>
  <change>
    <file>src/context/auth-context.tsx</file>
    <description>Remove AuthProvider component and related logic as login is disabled.</description>
    <content><![CDATA[