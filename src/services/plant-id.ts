
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
    Query,
    DocumentData,
    QueryDocumentSnapshot,
    startAfter,
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
// Guard against db being null during initialization or error
const plantsCollectionRef = db ? collection(db, 'plants') : null;

// Helper to check Firestore availability
function ensureDbAvailable() {
  if (firebaseInitializationError) {
    console.error("Firebase initialization failed:", firebaseInitializationError);
    // Ensure the template literal is correctly formed
    throw new Error(`Firebase não inicializado: ${firebaseInitializationError.message}`);
  }
  if (!db || !plantsCollectionRef) { // Check both db and the collection ref
    throw new Error('Instância do Firestore ou referência da coleção não está disponível. A inicialização pode ter falhado.');
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
  ensureDbAvailable(); // This will throw if db is null
  console.log(`Buscando planta com ID: ${plantId} no Firestore.`);
  try {
    // db is guaranteed to be non-null here because of ensureDbAvailable
    const plantDocRef = doc(db!, 'plants', plantId);
    const plantSnap = await getDoc(plantDocRef);

    if (plantSnap.exists()) {
      const data = plantSnap.data();
      console.log(`Planta encontrada:`, data);
      // Convert Timestamps back to ISO strings if needed
      const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
      const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
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
    // Ensure plantsCollectionRef is not null before using it
    if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");
    const q = query(plantsCollectionRef, orderBy('createdAt', 'desc'), firestoreLimit(count));
    const querySnapshot = await getDocs(q);

    const plants: Plant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
      const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
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
      // Ensure plantsCollectionRef is not null before using it
      if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");
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
          const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
          const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
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
  * Retrieves a paginated list of plants from Firestore, optionally filtered.
  * Orders alphabetically by strain name.
  *
  * @param options - Options for filtering and pagination.
  * @param options.filters - Object containing filter criteria (search, status, growRoom).
  * @param options.limit - The maximum number of plants to return per page.
  * @param options.lastVisible - The last visible document snapshot for pagination (fetches the next page).
  * @returns A promise that resolves to an object containing the plants array and the last visible document snapshot.
  */
 export async function getAllPlantsPaginated(options: {
   filters: { search?: string; status?: string; growRoom?: string };
   limit: number;
   lastVisible?: QueryDocumentSnapshot<DocumentData>;
 }): Promise<{ plants: Plant[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
   ensureDbAvailable();
   const { filters, limit, lastVisible } = options;
   console.log(`Buscando plantas paginadas no Firestore (limit: ${limit}) com filtros:`, filters);

   try {
     if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");

     // Base query ordered by strain
     let q: Query<DocumentData> = query(plantsCollectionRef, orderBy('strain', 'asc'));

     // Apply filters (Important: Complex queries might require composite indexes in Firestore)
     // Note: Firestore does not support direct 'contains' queries like SQL's LIKE.
     // Strain search might need to be done client-side or using a dedicated search service (e.g., Algolia) for large datasets.
     // For smaller datasets, we fetch and filter client-side (handled in the component).
     // We'll filter status and growRoom server-side if provided.
     if (filters.status && filters.status !== "all_statuses") {
       q = query(q, where('status', '==', filters.status));
     }
     if (filters.growRoom && filters.growRoom !== "all_rooms") {
       q = query(q, where('growRoomId', '==', filters.growRoom));
     }

     // Apply pagination limit
     q = query(q, firestoreLimit(limit));

     // Apply starting point for pagination
     if (lastVisible) {
       q = query(q, startAfter(lastVisible));
     }

     const querySnapshot = await getDocs(q);

     const plants: Plant[] = [];
     querySnapshot.forEach((doc) => {
       const data = doc.data();
       const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
       const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
       plants.push({ ...data, id: doc.id, birthDate, createdAt } as Plant);
     });

     // Get the last visible document for the next page query
     const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

     console.log(`Retornadas ${plants.length} plantas.`);
     return { plants, lastVisible: newLastVisible };

   } catch (error) {
     console.error('Erro ao buscar plantas paginadas no Firestore:', error);
     throw new Error(`Falha ao buscar plantas paginadas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
 * @deprecated Use specific fetching functions like getAllPlantsPaginated instead.
 */
// async function loadPlants(): Promise<Record<string, Plant>> {
//     const plants = await getAllPlants(); // Fetch all plants from Firestore
//     const plantRecord: Record<string, Plant> = {};
//     plants.forEach(plant => {
//         plantRecord[plant.id] = plant;
//     });
//     return plantRecord;
// }

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
