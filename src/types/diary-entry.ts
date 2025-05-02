
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
  <