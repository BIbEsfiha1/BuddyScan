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
  authorId: string;
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
  photoUrl?: string | null;
  /**
   * Resumo gerado pela análise de IA da foto (opcional).
   */
  aiSummary?: string | null;
   /**
   * Resposta JSON bruta da análise de IA (opcional, para depuração/auditoria).
   */
   // aiRawJson?: string | null; // Considere adicionar mais tarde, se necessário
}
