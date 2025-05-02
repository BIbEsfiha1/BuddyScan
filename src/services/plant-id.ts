
/**
 * Representa os dados associados a uma planta de cannabis.
 */
export interface Plant {
  /**
   * O identificador único da planta (gerado automaticamente).
   */
  id: string;
  /**
   * O código QR associado à planta (gerado automaticamente, igual ao id).
   */
  qrCode: string;
  /**
   * A variedade (strain) da planta de cannabis.
   */
  strain: string;
  /**
   * A data em que a planta nasceu (foi plantada). Formato ISO 8601.
   */
  birthDate: string;
  /**
   * O ID da sala de cultivo onde a planta está localizada.
   */
  growRoomId: string;
  /**
   * O status atual da planta (ex: Vegetativo, Floração, Secagem).
   */
  status: string;
}

const LOCAL_STORAGE_KEY = 'cannalogPlants';

// --- Helper Functions for localStorage ---

/**
 * Loads plants from localStorage.
 * Handles potential errors during parsing.
 * @returns A record of plants or an empty object if none found or error occurs.
 */
function loadPlantsFromLocalStorage(): Record<string, Plant> {
  if (typeof window === 'undefined') {
    // Cannot access localStorage on the server
    console.warn('Attempted to load plants from localStorage on the server.');
    return {};
  }
  try {
    const storedPlants = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedPlants) {
      return JSON.parse(storedPlants);
    }
  } catch (error) {
    console.error('Error loading plants from localStorage:', error);
    // Optionally clear corrupted data: localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  return {};
}

/**
 * Saves the current plant data to localStorage.
 * @param plants The plant data record to save.
 */
function savePlantsToLocalStorage(plants: Record<string, Plant>): void {
   if (typeof window === 'undefined') {
     console.warn('Attempted to save plants to localStorage on the server.');
     return;
   }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plants));
  } catch (error) {
    console.error('Error saving plants to localStorage:', error);
  }
}

// --- Service Functions using localStorage ---

/**
 * Recupera de forma assíncrona as informações da planta com base em um código QR escaneado.
 * Reads from localStorage.
 *
 * @param qrCode O código QR escaneado da planta de cannabis.
 * @returns Uma promessa que resolve para um objeto Plant se encontrado, caso contrário, null.
 */
export async function getPlantByQrCode(qrCode: string): Promise<Plant | null> {
  // Simulate potential async nature if this were a real API
  await new Promise(resolve => setTimeout(resolve, 50));

  console.log(`Buscando planta com QR Code: ${qrCode} no localStorage.`);
  const plants = loadPlantsFromLocalStorage();
  const plant = plants[qrCode]; // QR code is the key

  if (plant) {
    console.log(`Planta encontrada: ${plant.strain}`);
    return plant;
  } else {
    console.log(`Nenhuma planta encontrada para o QR Code: ${qrCode}`);
    return null;
  }
}

/**
 * Adiciona uma nova planta ao armazenamento de dados (localStorage).
 * O ID e o QR Code são passados como parte do objeto plantData (gerados antes de chamar esta função).
 *
 * @param plantData Os dados da nova planta a ser adicionada, incluindo o ID e QR Code gerados.
 * @returns Uma promessa que resolve quando a planta é adicionada. Rejeita se o ID já existir.
 */
export async function addPlant(plantData: Plant): Promise<void> {
  // Simulate potential async nature
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log(`Adicionando planta com ID/QR Code: ${plantData.id} ao localStorage.`);
  const plants = loadPlantsFromLocalStorage();

  if (plants[plantData.id]) {
    console.error(`Erro: ID '${plantData.id}' já existe no localStorage.`);
    throw new Error(`O ID '${plantData.id}' já está em uso.`);
  }

  plants[plantData.id] = { ...plantData };
  savePlantsToLocalStorage(plants);
  console.log(`Planta '${plantData.strain}' adicionada com sucesso com ID: ${plantData.id}.`);
}

/**
 * Recupera uma lista de plantas recentes do localStorage.
 * Ordena por data de nascimento como proxy para data de criação/atualização.
 *
 * @param limit O número máximo de plantas recentes a serem retornadas.
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
export async function getRecentPlants(limit: number = 3): Promise<Plant[]> {
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
  console.log('Buscando plantas recentes do localStorage...');

  const plants = loadPlantsFromLocalStorage();
  const allPlants = Object.values(plants);

  // Sort by birthDate (newest first)
  const sortedPlants = allPlants.sort((a, b) =>
    new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()
  );

  return sortedPlants.slice(0, limit);
}

/**
 * Recupera uma lista de plantas que precisam de atenção do localStorage.
 * Logic is client-side based on status keywords.
 *
 * @param limit O número máximo de plantas a serem retornadas.
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
 export async function getAttentionPlants(limit: number = 3): Promise<Plant[]> {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
    console.log('Buscando plantas que precisam de atenção no localStorage...');

    const plants = loadPlantsFromLocalStorage();
    const allPlants = Object.values(plants);

    // Simple client-side filter based on status keywords
    const attentionKeywords = ['problema', 'deficiência', 'excesso', 'praga', 'doença', 'amarel', 'queima', 'lento']; // Example keywords
    const attentionPlants = allPlants.filter(plant =>
        attentionKeywords.some(keyword => plant.status.toLowerCase().includes(keyword))
    );

    // Optionally, sort by date or another factor if needed
    attentionPlants.sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime());

    return attentionPlants.slice(0, limit);
 }


 // Optional: Function to get all plants (useful for debugging or other features)
 export async function getAllPlants(): Promise<Plant[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const plants = loadPlantsFromLocalStorage();
    return Object.values(plants);
 }
