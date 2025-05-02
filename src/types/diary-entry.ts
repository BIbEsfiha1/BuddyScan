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
  stage?: string;
  /**
   * Altura da planta em centímetros.
   */
  heightCm?: number;
  /**
   * Leitura de Condutividade Elétrica (EC).
   */
  ec?: number;
  /**
   * Leitura do nível de pH.
   */
  ph?: number;
  /**
   * Leitura de temperatura (°C).
   */
  temp?: number;
  /**
   * Leitura de umidade (%).
   */
  humidity?: number;
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
