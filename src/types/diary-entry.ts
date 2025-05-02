/**
 * Representa uma única entrada no diário de uma planta.
 */
export interface DiaryEntry {
  /**
   * Identificador único para a entrada do diário.
   */
  id: string;
  /**
   * ID da planta à qual esta entrada pertence.
   */
  plantId: string;
  /**
   * Timestamp ISO 8601 de quando a entrada foi criada.
   */
  timestamp: string;
  /**
   * ID do usuário que criou a entrada.
   * Considere vincular a um tipo User posteriormente.
   */
  authorId: string; // Keep as string for simplicity for now
  /**
   * Notas textuais ou observações.
   */
  note: string;
  /**
   * Estágio de crescimento (ex: Plântula, Vegetativo, Floração, Colhida).
   */
  stage?: string | null; // Allow null
  /**
   * Altura da planta em centímetros.
   */
  heightCm?: number | null; // Allow null
  /**
   * Leitura de Condutividade Elétrica (EC).
   */
  ec?: number | null; // Allow null
  /**
   * Leitura do nível de pH.
   */
  ph?: number | null; // Allow null
  /**
   * Leitura de temperatura (°C).
   */
  temp?: number | null; // Allow null
  /**
   * Leitura de umidade (%).
   */
  humidity?: number | null; // Allow null
  /**
   * URL de uma foto associada (opcional).
   * Em um aplicativo real, isso pode apontar para armazenamento em nuvem.
   */
  photoUrl?: string | null; // Store URL if uploaded, otherwise null
  /**
   * Resumo gerado pela análise de IA da foto (opcional).
   */
  aiSummary?: string | null;
   /**
   * Resposta JSON bruta da análise de IA (opcional, para depuração/auditoria).
   */
   // aiRawJson?: string | null; // Considere adicionar mais tarde, se necessário
}


const DIARY_STORAGE_PREFIX = 'cannalogDiary_';

/**
 * Loads diary entries for a specific plant from localStorage.
 * @param plantId The ID of the plant whose entries to load.
 * @returns An array of DiaryEntry objects, sorted newest first, or empty array.
 */
export function loadDiaryEntriesFromLocalStorage(plantId: string): DiaryEntry[] {
  if (typeof window === 'undefined') {
     console.warn(`Attempted to load diary entries for plant ${plantId} from localStorage on the server.`);
    return [];
  }
  const key = `${DIARY_STORAGE_PREFIX}${plantId}`;
  try {
    const storedEntries = localStorage.getItem(key);
    if (storedEntries) {
      const entries: DiaryEntry[] = JSON.parse(storedEntries);
      // Ensure sorting (newest first) as data might be saved unsorted
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  } catch (error) {
    console.error(`Error loading diary entries for plant ${plantId} from localStorage:`, error);
    // Optionally clear corrupted data: localStorage.removeItem(key);
  }
  return [];
}

/**
 * Saves diary entries for a specific plant to localStorage.
 * Overwrites existing entries for that plant.
 * @param plantId The ID of the plant whose entries to save.
 * @param entries The array of DiaryEntry objects to save.
 */
export function saveDiaryEntriesToLocalStorage(plantId: string, entries: DiaryEntry[]): void {
   if (typeof window === 'undefined') {
     console.warn(`Attempted to save diary entries for plant ${plantId} to localStorage on the server.`);
     return;
   }
   const key = `${DIARY_STORAGE_PREFIX}${plantId}`;
   try {
     // Sort before saving to maintain order (newest first)
     const sortedEntries = entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
     localStorage.setItem(key, JSON.stringify(sortedEntries));
   } catch (error) {
     console.error(`Error saving diary entries for plant ${plantId} to localStorage:`, error);
   }
}

/**
 * Adds a single new diary entry for a plant to localStorage.
 * Loads existing entries, adds the new one, sorts, and saves back.
 * @param plantId The ID of the plant.
 * @param newEntry The new DiaryEntry object to add.
 */
export function addDiaryEntryToLocalStorage(plantId: string, newEntry: DiaryEntry): void {
    if (typeof window === 'undefined') {
        console.warn(`Attempted to add diary entry for plant ${plantId} to localStorage on the server.`);
        return;
    }
    console.log(`Adding diary entry for plant ${plantId}:`, newEntry);
    const existingEntries = loadDiaryEntriesFromLocalStorage(plantId);
    const updatedEntries = [newEntry, ...existingEntries]; // Add new entry to the beginning
    saveDiaryEntriesToLocalStorage(plantId, updatedEntries); // Save (will also sort)
    console.log(`Diary entry added successfully for plant ${plantId}. Total entries: ${updatedEntries.length}`);
}
