// src/services/environment-service.ts

import { db, auth } from '@/lib/firebase/client'; // Import CLIENT-SIDE Firestore/Auth
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp, // Use serverTimestamp for creation time consistency
} from 'firebase/firestore';
import type { Environment } from '@/types/environment';

// --- Firestore Collection Reference ---
const environmentsCollectionRef = db ? collection(db, 'environments') : null;

// Helper to check Firestore availability and authentication
function ensureDbAndAuthAvailable() {
  if (!db || !environmentsCollectionRef) {
    console.error("Firestore DB instance (client) or collection ref is not available.");
    throw new Error('Instância do Firestore (client) ou referência da coleção de ambientes não está disponível.');
  }
  if (!auth?.currentUser) {
    console.error("User is not authenticated.");
    throw new Error('Usuário não autenticado.');
  }
  return auth.currentUser.uid; // Return current user ID
}

/**
 * Adds a new environment to Firestore for the current user.
 *
 * @param environmentData Data for the new environment (ownerId and createdAt will be set automatically).
 * @returns A promise that resolves with the newly created Environment object (including ID and timestamp).
 */
export async function addEnvironment(environmentData: Omit<Environment, 'id' | 'ownerId' | 'createdAt'>): Promise<Environment> {
  const ownerId = ensureDbAndAuthAvailable();
  console.log(`Adding environment for owner ${ownerId} to Firestore (Client).`);

  try {
    const dataToSave = {
      ...environmentData,
      ownerId: ownerId,
      createdAt: serverTimestamp(), // Let Firestore set the creation time
      capacity: environmentData.capacity ?? null, // Ensure null if undefined
      equipment: environmentData.equipment ?? [], // Ensure empty array if undefined
    };

    const docRef = await addDoc(environmentsCollectionRef!, dataToSave); // environmentsCollectionRef is non-null here
    console.log(`Environment '${environmentData.name}' added successfully with ID: ${docRef.id}.`);

    // Fetch the newly created doc to get the server timestamp and return the full object
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to fetch the newly created environment document.");
    }
    const savedData = newDocSnap.data();
    const createdAt = (savedData.createdAt instanceof Timestamp) ? savedData.createdAt.toDate().toISOString() : new Date().toISOString(); // Fallback

    return {
        ...savedData,
        id: newDocSnap.id,
        createdAt,
    } as Environment;

  } catch (error) {
    console.error(`Error adding environment '${environmentData.name}' to Firestore (Client):`, error);
    throw new Error(`Falha ao adicionar ambiente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Retrieves all environments owned by the current authenticated user from Firestore.
 *
 * @returns A promise that resolves to an array of Environment objects.
 */
export async function getEnvironmentsByOwner(): Promise<Environment[]> {
  const ownerId = ensureDbAndAuthAvailable();
  console.log(`Fetching environments for owner ${ownerId} from Firestore (Client).`);

  try {
    const q = query(
        environmentsCollectionRef!, // Non-null asserted
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc') // Order by creation date, newest first
    );

    const querySnapshot = await getDocs(q);

    const environments: Environment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt; // Convert timestamp
      environments.push({ ...data, id: doc.id, createdAt } as Environment);
    });
    console.log(`Retrieved ${environments.length} environments for owner ${ownerId}.`);
    return environments;
  } catch (error) {
    console.error(`Error fetching environments for owner ${ownerId} from Firestore (Client):`, error);
    throw new Error(`Falha ao buscar ambientes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}


/**
 * Retrieves a specific environment by its ID from Firestore.
 * Ensures the environment belongs to the current authenticated user.
 *
 * @param environmentId The ID of the environment to retrieve.
 * @returns A promise that resolves to the Environment object if found and owned by the user, otherwise null.
 */
export async function getEnvironmentById(environmentId: string): Promise<Environment | null> {
    const ownerId = ensureDbAndAuthAvailable();
    console.log(`Fetching environment with ID: ${environmentId} for owner ${ownerId} from Firestore (Client).`);

    try {
        const envDocRef = doc(db!, 'environments', environmentId); // db! asserted
        const envSnap = await getDoc(envDocRef);

        if (envSnap.exists()) {
            const data = envSnap.data();
            if (data.ownerId !== ownerId) {
                console.warn(`Environment ${environmentId} found, but owner mismatch. Requested by ${ownerId}, owned by ${data.ownerId}.`);
                return null; // Or throw an authorization error
            }
             const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
            return { ...data, id: envSnap.id, createdAt } as Environment;
        } else {
            console.warn(`No environment found for ID: ${environmentId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching environment ${environmentId} from Firestore (Client):`, error);
        throw new Error(`Falha ao buscar dados do ambiente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}

/**
 * Updates an existing environment in Firestore.
 * Ensures the environment belongs to the current authenticated user.
 *
 * @param environmentId The ID of the environment to update.
 * @param updateData An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateEnvironment(environmentId: string, updateData: Partial<Omit<Environment, 'id' | 'ownerId' | 'createdAt'>>): Promise<void> {
    const ownerId = ensureDbAndAuthAvailable();
    console.log(`Updating environment ID: ${environmentId} for owner ${ownerId} in Firestore (Client).`);

    try {
        const envDocRef = doc(db!, 'environments', environmentId); // db! asserted

        // Verify ownership before updating
        const envSnap = await getDoc(envDocRef);
        if (!envSnap.exists() || envSnap.data().ownerId !== ownerId) {
            throw new Error("Ambiente não encontrado ou você não tem permissão para atualizá-lo.");
        }

        // Prepare data, ensuring null for optional fields if cleared
        const dataToUpdate = {
            ...updateData,
            capacity: updateData.capacity === undefined ? envSnap.data().capacity : (updateData.capacity ?? null), // Keep old value if undefined, else use new value or null
            equipment: updateData.equipment === undefined ? envSnap.data().equipment : (updateData.equipment ?? []), // Keep old value if undefined, else use new value or []
        };


        await updateDoc(envDocRef, dataToUpdate);
        console.log(`Environment (ID: ${environmentId}) updated successfully.`);
    } catch (error) {
        console.error(`Error updating environment ${environmentId} in Firestore (Client):`, error);
        throw new Error(`Falha ao atualizar ambiente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}

/**
 * Deletes an environment from Firestore.
 * Ensures the environment belongs to the current authenticated user.
 * TODO: Consider implications - what happens to plants in this environment?
 *
 * @param environmentId The ID of the environment to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deleteEnvironment(environmentId: string): Promise<void> {
    const ownerId = ensureDbAndAuthAvailable();
    console.log(`Deleting environment ID: ${environmentId} for owner ${ownerId} from Firestore (Client).`);

    try {
        const envDocRef = doc(db!, 'environments', environmentId); // db! asserted

        // Verify ownership before deleting
        const envSnap = await getDoc(envDocRef);
        if (!envSnap.exists() || envSnap.data().ownerId !== ownerId) {
            throw new Error("Ambiente não encontrado ou você não tem permissão para excluí-lo.");
        }

        // TODO: Add logic here to handle plants associated with this environment
        // E.g., move them to a default environment, archive them, or prevent deletion if plants exist.
        // For now, it just deletes the environment document.
        // Example check (requires plant service function):
        // const plantsInEnv = await getPlantsByEnvironment(environmentId);
        // if (plantsInEnv.length > 0) {
        //   throw new Error("Não é possível excluir um ambiente que contém plantas. Mova ou exclua as plantas primeiro.");
        // }

        await deleteDoc(envDocRef);
        console.log(`Environment (ID: ${environmentId}) deleted successfully.`);
    } catch (error) {
        console.error(`Error deleting environment ${environmentId} in Firestore (Client):`, error);
        throw new Error(`Falha ao excluir ambiente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}
