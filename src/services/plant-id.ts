/**
 * Representa os dados associados a uma planta de cannabis.
 */
export interface Plant {
  /**
   * O identificador único da planta.
   */
id: string;
  /**
   * O código QR associado à planta.
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
   * O status atual da planta (ex: Crescendo, Florindo, Colhida).
   */
  status: string;
}

/**
 * Recupera de forma assíncrona as informações da planta com base em um código QR escaneado.
 *
 * @param qrCode O código QR escaneado da planta de cannabis.
 * @returns Uma promessa que resolve para um objeto Plant se encontrado, caso contrário, null.
 */
export async function getPlantByQrCode(qrCode: string): Promise<Plant | null> {
  // TODO: Implementar chamando uma API externa.

  // Mock data - Simula encontrar uma planta
  console.log(`Simulando busca pela planta com QR Code: ${qrCode}`);
  if (qrCode === 'plant123') {
    return {
      id: 'plant123',
      qrCode: qrCode,
      strain: 'Variedade Exemplo', // Translated
      birthDate: '2024-01-01T00:00:00Z', // ISO format example
      growRoomId: 'sala42', // Translated
      status: 'Crescendo', // Translated (Example status)
    };
  }

  // Retorna null se o QR Code não corresponder ao mock
  return null;
}
