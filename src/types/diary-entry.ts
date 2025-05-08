import { db } from '@/lib/firebase/client'; // Import CLIENT-SIDE db instance
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
    CollectionReference, // Import CollectionReference type
    DocumentData, // Import DocumentData type
    QueryDocumentSnapshot,
    startAfter,
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
   */
  photoUrl?: string | null;
  /**
   * Resumo gerado pela análise de IA da foto (opcional).
   */
  aiSummary?: string | null;
}

// Helper to check Firestore availability (client-side)
function ensureDbAvailable() {
  if (!db) {
      console.error("Firestore DB instance (client) is not available.");
      throw new Error('Instância do Firestore (client) não está disponível.');
  }
}


// Firestore Collection Path: /plants/{plantId}/diaryEntries
export const getDiaryEntriesCollectionRef = (plantId: string): CollectionReference<DocumentData> => {
   ensureDbAvailable(); // Ensure db is available before calling collection
   // db is guaranteed non-null here
   return collection(db!, 'plants', plantId, 'diaryEntries');
};


/**
 * Loads paginated diary entries for a specific plant from Firestore using client SDK.
 * @param plantId The ID of the plant whose entries to load.
 * @param limit The maximum number of entries per page.
 * @param lastVisible The last document snapshot from the previous page for pagination.
 * @returns An object containing the array of DiaryEntry objects and the last visible document snapshot.
 */
export async function loadDiaryEntriesPaginated(
    plantId: string,
    limit: number,
    lastVisible?: QueryDocumentSnapshot<DocumentData>
): Promise<{ entries: DiaryEntry[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
  ensureDbAvailable(); // Checks for client db initialization
  console.log(`Carregando entradas do diário paginadas para planta ${plantId} (limit: ${limit}) do Firestore (Client)...`);
  try {
    const diaryEntriesCollection = getDiaryEntriesCollectionRef(plantId);
    let q = query(diaryEntriesCollection, orderBy('timestamp', 'desc'), firestoreLimit(limit)); // Order by Firestore timestamp

    if (lastVisible) {
        q = query(q, startAfter(lastVisible));
    }

    const querySnapshot = await getDocs(q);

    const entries: DiaryEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore Timestamp back to ISO string
      const timestamp = (data.timestamp instanceof Timestamp) ? data.timestamp.toDate().toISOString() : data.timestamp;
      entries.push({
        ...data,
        id: doc.id,
        timestamp: timestamp,
      } as DiaryEntry);
    });

    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    console.log(`Carregadas ${entries.length} entradas do diário (Client). Próxima página começa após: ${newLastVisible?.id}`);

    return { entries, lastVisible: newLastVisible };

  } catch (error) {
    console.error(`Erro ao carregar entradas do diário paginadas para ${plantId} do Firestore (Client):`, error);
    throw new Error(`Falha ao carregar entradas do diário paginadas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}


/**
 * Adds a single new diary entry for a plant to Firestore using client SDK.
 * Firestore generates the ID automatically.
 * @param plantId The ID of the plant.
 * @param newEntryData The DiaryEntry data to add (without the 'id' field). Must include authorId.
 * @returns The newly created DiaryEntry object with its Firestore-generated ID.
 */
export async function addDiaryEntryToFirestore(plantId: string, newEntryData: Omit<DiaryEntry, 'id'>): Promise<DiaryEntry> {
    ensureDbAvailable(); // Checks for client db initialization
    console.log(`Adicionando entrada do diário para planta ${plantId} no Firestore (Client):`, newEntryData);

    // Ensure authorId is present (critical for security rules typically)
    if (!newEntryData.authorId) {
        throw new Error("Author ID é obrigatório para adicionar uma entrada no diário.");
    }

    try {
        const diaryEntriesCollection = getDiaryEntriesCollectionRef(plantId);
        const dataToSave = {
          ...newEntryData,
          timestamp: Timestamp.fromDate(new Date(newEntryData.timestamp)), // Convert ISO string to Timestamp
        };

        // Use addDoc to let Firestore generate the ID
        const docRef = await addDoc(diaryEntriesCollection, dataToSave);
        console.log(`Entrada do diário adicionada com ID: ${docRef.id} para planta ${plantId} (Client)`);

        // Return the full entry object including the new ID
        return {
            ...newEntryData,
            id: docRef.id,
        };

    } catch (error) {
        console.error(`Erro ao adicionar entrada do diário para planta ${plantId} no Firestore (Client):`, error);
        throw new Error(`Falha ao adicionar entrada do diário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}


// --- Deprecated localStorage Functions ---
// These remain commented out/disabled.

const DIARY_STORAGE_PREFIX = 'budscanDiary_DISABLED_'; // Disable localStorage prefix

/**
 * Loads diary entries for a specific plant from localStorage.
 * @param plantId The ID of the plant whose entries to load.
 * @returns An array of DiaryEntry objects, sorted newest first, or empty array.
 * @deprecated Use loadDiaryEntriesPaginated instead.
 */
// export function loadDiaryEntriesFromLocalStorage(plantId: string): DiaryEntry[] { ... }

/**
 * Saves diary entries for a specific plant to localStorage.
 * @param plantId The ID of the plant whose entries to save.
 * @param entries The array of DiaryEntry objects to save.
 * @deprecated Use addDiaryEntryToFirestore instead.
 */
// export function saveDiaryEntriesToLocalStorage(plantId: string, entries: DiaryEntry[]): void { ... }

/**
 * Adds a single new diary entry for a plant to localStorage.
 * @param plantId The ID of the plant.
 * @param newEntry The new DiaryEntry object to add.
 * @deprecated Use addDiaryEntryToFirestore instead.
 */
// export function addDiaryEntryToLocalStorage(plantId: string, newEntry: DiaryEntry): void { ... }

// Deprecated function, use loadDiaryEntriesPaginated
// export async function loadDiaryEntriesFromFirestore(plantId: string): Promise<DiaryEntry[]> { ... }
