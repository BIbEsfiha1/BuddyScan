// src/types/environment.ts

/**
 * Representa um ambiente de cultivo (Grow Room).
 */
export interface Environment {
  /**
   * Identificador único do ambiente (gerado pelo Firestore).
   */
  id: string;
  /**
   * Nome dado ao ambiente pelo usuário.
   */
  name: string;
  /**
   * Tipo de ambiente (Indoor, Outdoor, Estufa).
   */
  type: 'Indoor' | 'Outdoor' | 'Estufa'; // Greenhouse
  /**
   * Capacidade máxima de plantas (opcional).
   */
  capacity?: number | null;
  /**
   * Lista de equipamentos associados (nomes ou descrições, opcional).
   */
  equipment?: string[];
  /**
   * ID do usuário (Firebase UID) proprietário deste ambiente.
   */
  ownerId: string;
   /**
   * Timestamp de quando o ambiente foi criado (gerado pelo Firestore).
   */
   createdAt: string; // Store as ISO string
}

export const ENVIRONMENT_TYPES: Environment['type'][] = ['Indoor', 'Outdoor', 'Estufa'];
