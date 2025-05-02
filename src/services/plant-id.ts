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

// Expand mock data to include plants from the dashboard examples
const mockPlants: Record<string, Plant> = {
  'plant123': {
      id: 'plant123', // Assuming this was manually entered before
      qrCode: 'plant123',
      strain: 'Variedade Exemplo',
      birthDate: '2024-01-15T00:00:00Z',
      growRoomId: 'sala42',
      status: 'Vegetativo',
  },
  'plant456': {
      id: 'plant456',
      qrCode: 'plant456',
      strain: 'Purple Haze',
      birthDate: '2024-02-01T00:00:00Z',
      growRoomId: 'sala01',
      status: 'Floração',
  },
  'plant789': {
      id: 'plant789',
      qrCode: 'plant789',
      strain: 'Sour Diesel',
      birthDate: '2023-12-10T00:00:00Z',
      growRoomId: 'sala01',
      status: 'Secagem',
  },
  'plantABC': {
      id: 'plantABC',
      qrCode: 'plantABC',
      strain: 'Cepa Problema', // Strain from attention list
      birthDate: '2024-01-20T00:00:00Z',
      growRoomId: 'sala02',
      status: 'Vegetativo', // Status from attention list
  },
  'plantDEF': {
      id: 'plantDEF',
      qrCode: 'plantDEF',
      strain: 'White Widow', // Strain from attention list
      birthDate: '2024-01-05T00:00:00Z',
      growRoomId: 'sala03',
      status: 'Floração', // Status from attention list
  },
  'plantGHI': {
      id: 'plantGHI',
      qrCode: 'plantGHI',
      strain: 'OG Kush', // Strain from attention list
      birthDate: '2024-02-10T00:00:00Z',
      growRoomId: 'sala03',
      status: 'Floração', // Status from attention list
  }
};


/**
 * Recupera de forma assíncrona as informações da planta com base em um código QR escaneado.
 *
 * @param qrCode O código QR escaneado da planta de cannabis.
 * @returns Uma promessa que resolve para um objeto Plant se encontrado, caso contrário, null.
 */
export async function getPlantByQrCode(qrCode: string): Promise<Plant | null> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

  console.log(`Simulando busca pela planta com QR Code: ${qrCode}`);
  // In mock data, the key is the ID/QR code. In a real DB, you'd query by the qrCode field.
  const plant = mockPlants[qrCode];

  if (plant) {
    console.log(`Planta encontrada: ${plant.strain}`);
    return plant;
  } else {
    console.log(`Nenhuma planta encontrada para o QR Code: ${qrCode}`);
    return null;
  }
}


/**
 * Adiciona uma nova planta ao armazenamento de dados (mock).
 * Em um aplicativo real, isso interagiria com um backend/banco de dados.
 * O ID e o QR Code são passados como parte do objeto plantData (gerados antes de chamar esta função).
 *
 * @param plantData Os dados da nova planta a ser adicionada, incluindo o ID e QR Code gerados.
 * @returns Uma promessa que resolve quando a planta é adicionada. Rejeita se o ID já existir.
 */
export async function addPlant(plantData: Plant): Promise<void> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));

  console.log(`Tentando adicionar planta com ID/QR Code gerado: ${plantData.id}`);

  // Check if the generated ID already exists (highly unlikely with the generator, but good practice)
  if (mockPlants[plantData.id]) {
    console.error(`Erro: ID '${plantData.id}' gerado já existe (colisão?).`);
    // This case should ideally not happen. If it does, retry generation or use a more robust UUID.
    throw new Error(`Falha ao gerar um ID único para a planta. Tente novamente.`);
  }

  // Add the new plant to the mock data store using its generated ID as the key
  mockPlants[plantData.id] = { ...plantData };
  console.log(`Planta '${plantData.strain}' adicionada com sucesso com ID: ${plantData.id}.`);

  // No return needed, throws error on failure
}

/**
 * Recupera uma lista de plantas recentes (mock).
 * Em um aplicativo real, isso consultaria o banco de dados ordenando por data de atualização.
 *
 * @returns Uma promessa que resolve para um array de objetos Plant.
 */
 export async function getRecentPlants(limit: number = 3): Promise<Plant[]> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    console.log('Buscando plantas recentes (mock)...');

    // Sort all plants by birthDate (newest first) as a proxy for recent updates in mock data
    const sortedPlants = Object.values(mockPlants).sort((a, b) =>
      new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()
    );

    return sortedPlants.slice(0, limit);
 }

 /**
  * Recupera uma lista de plantas que precisam de atenção (mock).
  * Em um aplicativo real, isso consultaria com base em regras/flags específicas.
  *
  * @returns Uma promessa que resolve para um array de objetos Plant.
  */
  export async function getAttentionPlants(limit: number = 3): Promise<Plant[]> {
     await new Promise(resolve => setTimeout(resolve, 250)); // Simulate delay
     console.log('Buscando plantas que precisam de atenção (mock)...');

     // Filter mock plants based on some arbitrary condition (e.g., specific QR codes)
     const attentionQrCodes = ['plantABC', 'plantDEF', 'plantGHI']; // Example QR codes needing attention
     const attentionPlants = attentionQrCodes.map(qr => mockPlants[qr]).filter(Boolean); // Filter out nulls if QR code doesn't exist

     return attentionPlants.slice(0, limit);
  }
