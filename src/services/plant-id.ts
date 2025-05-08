// src/services/plant-id.ts
import { db, auth } from '@/lib/firebase/client'; // Import CLIENT-SIDE Firestore/Auth
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
    serverTimestamp, // Use serverTimestamp for consistency
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
   * O nome do lote ou grupo ao qual esta planta pertence.
   */
  lotName: string; // Added
  /**
   * Data estimada de colheita (opcional). Armazenado como string ISO 8601.
   */
  estimatedHarvestDate?: string | null; // Added
  /**
   * A data em que a planta nasceu (foi plantada). Armazenado como string ISO 8601.
   */
  birthDate: string; // Store as ISO string in object, convert to Timestamp for Firestore
  /**
   * O ID do ambiente (Environment) onde a planta está localizada.
   */
  growRoomId: string; // Changed from 'Sala de Cultivo' to 'Environment ID' for clarity
  /**
   * O status atual da planta (ex: Ativa, Em tratamento, Colhida).
   */
  status: string;
  /**
   * Timestamp de quando a planta foi criada (opcional, mas útil para ordenação). Armazenado como string ISO 8601.
   */
  createdAt?: string; // Store as ISO string
   /**
   * ID do usuário (Firebase UID) proprietário desta planta.
   */
  ownerId: string; // Added ownerId field
}

// Define os estados recomendados para uma planta individual
export const PLANT_STATES = [
  'Ativa',             // Active/Growing
  'Em tratamento',     // Needs attention / Under treatment
  'Diagnóstico Pendente', // AI Analysis pending
  'Colhida',           // Harvested successfully
  'Perdida',           // Lost/Dead/Discarded
  // Add others if needed, like 'Secagem', 'Cura' if tracked per-plant
];

// Define os estágios comuns de crescimento da cannabis (pode ser usado no diário)
export const CANNABIS_GROWTH_STAGES = [
    'Semente', // Seed
    'Plântula', // Seedling
    'Clone',    // Clone
    'Vegetativo', // Vegetative
    'Pré-floração', // Pre-flowering
    'Floração', // Flowering
    // Colhida, Secagem, Cura, Finalizada might be PLANT_STATES instead
];

// --- Firestore Collection Reference ---
// Uses the client-side 'db' instance imported from client.ts
const plantsCollectionRef = db ? collection(db, 'plants') : null;

// Helper to check Firestore availability (important for client-side)
function ensureDbAvailable() {
  // We rely on the client db instance. If it's null, something went wrong during its init.
  if (!db || !plantsCollectionRef) {
      console.error("Firestore DB instance (client) or collection ref is not available.");
      throw new Error('Instância do Firestore (client) ou referência da coleção de plantas não está disponível.');
  }
}

// --- Service Functions using Firestore ---

/**
 * Recupera de forma assíncrona as informações da planta com base em um ID/código QR.
 * Optionally filters by ownerId.
 * Reads from Firestore using the client SDK.
 *
 * @param plantId The ID (or QR Code) of the plant.
 * @param ownerId Optional: The UID of the owner to check against. If provided, only returns the plant if the owner matches.
 * @returns Uma promessa que resolve para um objeto Plant se encontrado (and owner matches, if provided), caso contrário, null.
 */
export async function getPlantById(plantId: string, ownerId?: string): Promise<Plant | null> {
  ensureDbAvailable(); // This will throw if db is null
  console.log(`Buscando planta com ID: ${plantId} no Firestore (Client). Owner check: ${ownerId ? 'Yes' : 'No'}`);
  try {
    const plantDocRef = doc(db!, 'plants', plantId); // db! asserts db is non-null due to ensureDbAvailable
    const plantSnap = await getDoc(plantDocRef);

    if (plantSnap.exists()) {
      const data = plantSnap.data();
      console.log(`Planta encontrada:`, data);

      // Enforce owner check if ownerId is provided
      if (ownerId && data.ownerId !== ownerId) {
          console.warn(`Plant ${plantId} found, but owner mismatch. Requested by ${ownerId}, owned by ${data.ownerId}.`);
          return null; // Return null if owner doesn't match
      }

      // Convert Timestamps back to ISO strings if needed
      const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
      const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
      const estimatedHarvestDate = data.estimatedHarvestDate ?
                                     ((data.estimatedHarvestDate instanceof Timestamp) ? data.estimatedHarvestDate.toDate().toISOString() : data.estimatedHarvestDate)
                                     : null; // Handle optional date
      return { ...data, id: plantSnap.id, birthDate, createdAt, estimatedHarvestDate } as Plant;
    } else {
      console.warn(`Nenhuma planta encontrada para o ID: ${plantId}`);
      return null;
    }
  } catch (error) {
    console.error(`Erro ao buscar planta ${plantId} no Firestore (Client):`, error);
    throw new Error(`Falha ao buscar dados da planta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Alias for getPlantByQrCode assuming qrCode === id
export const getPlantByQrCode = getPlantById;


/**
 * Adiciona uma nova planta ao Firestore using the client SDK.
 * O ID e o QR Code são passados como parte do objeto plantData.
 * O status inicial é definido internamente. Owner ID MUST be included in plantData.
 *
 * @param plantData Os dados da nova planta a ser adicionada, incluindo id, qrCode, lotName, ownerId etc. O campo 'status' será sobrescrito.
 * @returns Uma promessa que resolve com o objeto Plant completo (incluindo status e createdAt) quando a planta é adicionada. Rejeita se o ID já existir ou em caso de erro.
 */
export async function addPlant(plantData: Omit<Plant, 'status' | 'createdAt'> & { status?: string; createdAt?: string }): Promise<Plant> {
  ensureDbAvailable();
  console.log(`Adicionando planta com ID: ${plantData.id} ao Firestore (Client).`);

   // Enforce ownerId presence
   if (!plantData.ownerId) {
       throw new Error("Owner ID é obrigatório para adicionar uma planta.");
   }

  try {
    const plantDocRef = doc(db!, 'plants', plantData.id); // Use client db

    // Optional: Check if document already exists (client-side check)
    const docSnap = await getDoc(plantDocRef);
    if (docSnap.exists()) {
      console.error(`Erro: Documento com ID '${plantData.id}' já existe no Firestore.`);
      throw new Error(`O ID da planta '${plantData.id}' já está em uso.`);
    }

    // Convert dates to Timestamps for Firestore storage
    const birthDateTimestamp = Timestamp.fromDate(new Date(plantData.birthDate));
    const estimatedHarvestDateTimestamp = plantData.estimatedHarvestDate ? Timestamp.fromDate(new Date(plantData.estimatedHarvestDate)) : null;
    const createdAtTimestamp = serverTimestamp(); // Use server timestamp

    const dataToSave = {
      ...plantData,
      status: PLANT_STATES[0], // Set initial status to 'Ativa'
      birthDate: birthDateTimestamp,
      createdAt: createdAtTimestamp,
      estimatedHarvestDate: estimatedHarvestDateTimestamp,
      ownerId: plantData.ownerId, // Ensure ownerId is saved
    };

    await setDoc(plantDocRef, dataToSave);
    console.log(`Planta '${plantData.strain}' adicionada com sucesso com ID: ${plantData.id}.`);

    // Fetch the doc again to get the actual server timestamp
    const savedDocSnap = await getDoc(plantDocRef);
    if (!savedDocSnap.exists()) {
        throw new Error("Failed to fetch the newly saved plant document.");
    }
    const savedData = savedDocSnap.data();
    const createdAtISO = (savedData.createdAt instanceof Timestamp)
        ? savedData.createdAt.toDate().toISOString()
        : new Date().toISOString(); // Fallback just in case

    // Return the full object as it exists in the application state (ISO dates)
    const savedPlant: Plant = {
      ...plantData, // Includes id, qrCode, strain, lotName, birthDate (ISO), growRoomId, ownerId, estimatedHarvestDate (ISO or null)
      id: plantData.id, // Ensure ID is present
      status: PLANT_STATES[0],
      createdAt: createdAtISO,
    };
    return savedPlant;

  } catch (error) {
    console.error(`Erro ao adicionar planta ${plantData.id} ao Firestore (Client):`, error);
     throw new Error(`Falha ao adicionar planta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Updates the status of an existing plant in Firestore using the client SDK.
 * Ensures the plant belongs to the provided ownerId.
 *
 * @param plantId The ID of the plant to update.
 * @param newStatus The new status string (should be one of PLANT_STATES).
 * @param ownerId The UID of the user attempting the update. Checks ownership.
 * @returns A promise that resolves when the plant status is updated. Rejects if the plant ID is not found, owner doesn't match, or on error.
 */
export async function updatePlantStatus(plantId: string, newStatus: string, ownerId: string): Promise<void> {
  ensureDbAvailable();
  console.log(`Atualizando status da planta ID: ${plantId} para "${newStatus}" no Firestore (Client). Owner check: Yes`);

  if (!ownerId) {
      throw new Error("Autenticação necessária para atualizar status.");
  }

  if (!PLANT_STATES.includes(newStatus)) {
       console.warn(`Status "${newStatus}" não é um estado de planta válido. Salvando mesmo assim, mas pode causar inconsistências.`);
  }

  try {
    const plantDocRef = doc(db!, 'plants', plantId); // Use client db

    // Verify ownership before updating
    const plantSnap = await getDoc(plantDocRef);
    if (!plantSnap.exists()) {
        throw new Error(`Planta com ID '${plantId}' não encontrada para atualização.`);
    }
    if (plantSnap.data().ownerId !== ownerId) {
        console.warn(`Update denied for plant ${plantId}. User ${ownerId} does not own it.`);
        throw new Error("Você não tem permissão para atualizar esta planta.");
    }

    await updateDoc(plantDocRef, {
      status: newStatus,
      // lastUpdatedAt: serverTimestamp(), // Optional: track last update time
    });
    console.log(`Status da planta (ID: ${plantId}) atualizado para "${newStatus}".`);
  } catch (error) {
    console.error(`Erro ao atualizar status da planta ${plantId} no Firestore (Client):`, error);
     throw new Error(`Falha ao atualizar status da planta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}


/**
 * Recupera uma lista de plantas recentes do Firestore usando o client SDK.
 * Filters by ownerId.
 *
 * @param ownerId The UID of the owner to filter by.
 * @param count O número máximo de plantas recentes a serem retornadas.
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
export async function getRecentPlants(ownerId: string, count: number = 3): Promise<Plant[]> {
  ensureDbAvailable();
  console.log(`Buscando ${count} plantas recentes do Firestore (Client) para owner ${ownerId}.`);
  if (!ownerId) {
      throw new Error("Owner ID é necessário para buscar plantas recentes.");
  }
  try {
    if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");

    const q = query(
        plantsCollectionRef,
        where('ownerId', '==', ownerId), // Filter by owner
        orderBy('createdAt', 'desc'),
        firestoreLimit(count)
    );

    const querySnapshot = await getDocs(q);

    const plants: Plant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
      const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
      const estimatedHarvestDate = data.estimatedHarvestDate ?
                                    ((data.estimatedHarvestDate instanceof Timestamp) ? data.estimatedHarvestDate.toDate().toISOString() : data.estimatedHarvestDate)
                                    : null;
      plants.push({ ...data, id: doc.id, birthDate, createdAt, estimatedHarvestDate } as Plant);
    });
    console.log(`Retornadas ${plants.length} plantas recentes.`);
    return plants;
  } catch (error) {
    console.error('Erro ao buscar plantas recentes no Firestore (Client):', error);
    throw new Error(`Falha ao buscar plantas recentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Recupera uma lista de plantas que precisam de atenção do Firestore usando o client SDK.
 * Filters by ownerId.
 *
 * @param ownerId The UID of the owner to filter by.
 * @param count O número máximo de plantas a serem retornadas.
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
 export async function getAttentionPlants(ownerId: string, count: number = 3): Promise<Plant[]> {
    ensureDbAvailable();
    console.log(`Buscando ${count} plantas que precisam de atenção no Firestore (Client) para owner ${ownerId}.`);
     if (!ownerId) {
         throw new Error("Owner ID é necessário para buscar plantas com atenção.");
     }
    try {
      if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");

      const attentionStatuses = ['Em tratamento', 'Diagnóstico Pendente'];
      // Composite index required: (ownerId ==, status IN, createdAt DESC)
      const q = query(
          plantsCollectionRef,
          where('ownerId', '==', ownerId), // Add owner filter
          where('status', 'in', attentionStatuses),
          orderBy('createdAt', 'desc'),
          firestoreLimit(count)
      );

      const querySnapshot = await getDocs(q);

      const plants: Plant[] = [];
      querySnapshot.forEach((doc) => {
          const data = doc.data();
          const birthDate = (data.birthDate instanceof Timestamp) ? data.birthDate.toDate().toISOString() : data.birthDate;
          const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
          const estimatedHarvestDate = data.estimatedHarvestDate ?
                                        ((data.estimatedHarvestDate instanceof Timestamp) ? data.estimatedHarvestDate.toDate().toISOString() : data.estimatedHarvestDate)
                                        : null;
          plants.push({ ...data, id: doc.id, birthDate, createdAt, estimatedHarvestDate } as Plant);
      });
      console.log(`Retornadas ${plants.length} plantas que precisam de atenção.`);
      return plants;
    } catch (error) {
        console.error('Erro ao buscar plantas que precisam de atenção no Firestore (Client):', error);
        // Check for missing index error
         if (error instanceof Error && error.message.includes("index")) {
             console.error("Firestore Index Error: Ensure the required composite index (ownerId ==, status IN, createdAt DESC) exists in your Firebase console.");
             throw new Error(`Falha ao buscar: índice Firestore ausente. Verifique o console do Firebase.`);
         }
        throw new Error(`Falha ao buscar plantas com atenção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
 }


 /**
  * Retrieves a paginated list of plants from Firestore using the client SDK, filtered by owner.
  * Orders alphabetically by strain name.
  *
  * @param options - Options for filtering and pagination.
  * @param options.filters - Object containing filter criteria (search [client-side], status, growRoom, ownerId [REQUIRED]).
  * @param options.limit - The maximum number of plants to return per page.
  * @param options.lastVisible - The last visible document snapshot for pagination.
  * @returns A promise that resolves to an object containing the plants array and the last visible document snapshot.
  */
 export async function getAllPlantsPaginated(options: {
   filters: { search?: string; status?: string; growRoom?: string; ownerId: string }; // Made ownerId mandatory
   limit: number;
   lastVisible?: QueryDocumentSnapshot<DocumentData>;
 }): Promise<{ plants: Plant[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
   ensureDbAvailable();
   const { filters, limit, lastVisible } = options;
   console.log(`Buscando plantas paginadas no Firestore (Client) (limit: ${limit}) para owner ${filters.ownerId} com filtros:`, filters);

   if (!filters.ownerId) {
       throw new Error("Owner ID é obrigatório para buscar plantas paginadas.");
   }

   try {
     if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");

     // Base query ordered by strain, filtered by owner
     let q: Query<DocumentData> = query(
        plantsCollectionRef,
        where('ownerId', '==', filters.ownerId),
        orderBy('strain', 'asc')
     );

     // Apply other filters (status, growRoom)
     // Note: Queries with multiple filters might require composite indexes in Firestore
     if (filters.status && filters.status !== "all_statuses") {
       // Requires index: (ownerId ==, status ==, strain ASC)
       q = query(q, where('status', '==', filters.status));
     }
     if (filters.growRoom && filters.growRoom !== "all_rooms") {
       // Requires index: (ownerId ==, growRoomId ==, strain ASC)
       // If filtering by BOTH status and growRoom: (ownerId ==, status ==, growRoomId ==, strain ASC)
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
        const estimatedHarvestDate = data.estimatedHarvestDate ?
                                        ((data.estimatedHarvestDate instanceof Timestamp) ? data.estimatedHarvestDate.toDate().toISOString() : data.estimatedHarvestDate)
                                        : null;
       plants.push({ ...data, id: doc.id, birthDate, createdAt, estimatedHarvestDate } as Plant);
     });

     // Get the last visible document for the next page query
     const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

     console.log(`Retornadas ${plants.length} plantas.`);
     return { plants, lastVisible: newLastVisible };

   } catch (error) {
     console.error('Erro ao buscar plantas paginadas no Firestore (Client):', error);
      if (error instanceof Error && error.message.includes("index")) {
           console.error("Firestore Index Error: Ensure the required composite index exists in your Firebase console based on the active filters (e.g., ownerId, status, growRoomId, strain).");
           throw new Error(`Falha ao buscar: índice Firestore ausente ou incorreto para os filtros aplicados. Verifique o console do Firebase.`);
      }
     throw new Error(`Falha ao buscar plantas paginadas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
   }
 }

 // Function to get plants by environment ID (for deletion check, etc.)
 export async function getPlantsByEnvironment(environmentId: string, ownerId: string): Promise<Plant[]> {
     ensureDbAvailable();
     console.log(`Checking plants in environment ${environmentId} for owner ${ownerId}.`);
     if (!ownerId) throw new Error("Owner ID required.");
     if (!plantsCollectionRef) throw new Error("plantsCollectionRef is null");

     try {
         // Index required: (ownerId ==, growRoomId ==)
         const q = query(
             plantsCollectionRef,
             where('ownerId', '==', ownerId),
             where('growRoomId', '==', environmentId)
         );
         const querySnapshot = await getDocs(q);
         return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
     } catch (error) {
         console.error(`Error fetching plants for environment ${environmentId}:`, error);
          if (error instanceof Error && error.message.includes("index")) {
              console.error("Firestore Index Error: Ensure the index (ownerId ==, growRoomId ==) exists.");
              throw new Error(`Falha ao verificar plantas no ambiente: índice Firestore ausente.`);
          }
         throw new Error(`Falha ao verificar plantas no ambiente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
     }
 }


// --- Deprecated Local Storage Functions ---
// Removed as they are no longer relevant with Firestore implementation.
