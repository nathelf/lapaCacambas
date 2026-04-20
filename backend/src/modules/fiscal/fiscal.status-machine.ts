/**
 * Máquina de estados da Nota Fiscal.
 *
 * Centraliza todas as regras de transição — nenhum outro arquivo
 * deve setar status diretamente sem passar por aqui.
 *
 * Regra de ouro: estados terminais (EMITIDA, CANCELADA, REJEITADA)
 * não podem ser revertidos.
 */
import { NotaFiscalStatus, type NotaFiscalStatusType } from './fiscal.constants';
import { FiscalConflictError } from './fiscal.errors';

// ─── Grafo de transições permitidas ──────────────────────────────────────────
// Chave: estado origem → Valor: estados destino válidos
const TRANSICOES: Readonly<Record<NotaFiscalStatusType, NotaFiscalStatusType[]>> = {
  [NotaFiscalStatus.PENDENTE]: [
    NotaFiscalStatus.VALIDANDO,
    NotaFiscalStatus.REJEITADA,   // rejeição imediata por regra de negócio
  ],
  [NotaFiscalStatus.VALIDANDO]: [
    NotaFiscalStatus.VALIDADA,
    NotaFiscalStatus.REJEITADA,
  ],
  [NotaFiscalStatus.VALIDADA]: [
    NotaFiscalStatus.EM_PROCESSAMENTO,
    NotaFiscalStatus.REJEITADA,
  ],
  [NotaFiscalStatus.EM_PROCESSAMENTO]: [
    NotaFiscalStatus.EMITIDA,
    NotaFiscalStatus.ERRO_INTEGRACAO,
    NotaFiscalStatus.REJEITADA,
  ],
  [NotaFiscalStatus.EMITIDA]: [
    NotaFiscalStatus.CANCELAMENTO_SOLICITADO,
  ],
  [NotaFiscalStatus.CANCELAMENTO_SOLICITADO]: [
    NotaFiscalStatus.CANCELADA,
    NotaFiscalStatus.EMITIDA,      // cancelamento negado pelo município
    NotaFiscalStatus.ERRO_INTEGRACAO,
  ],
  [NotaFiscalStatus.REJEITADA]: [],          // terminal
  [NotaFiscalStatus.CANCELADA]: [],          // terminal
  [NotaFiscalStatus.ERRO_INTEGRACAO]: [
    NotaFiscalStatus.EM_PROCESSAMENTO,       // retry
    NotaFiscalStatus.REJEITADA,              // abandonar após esgotamento de tentativas
  ],
};

// ─── Estados terminais ────────────────────────────────────────────────────────
const ESTADOS_TERMINAIS = new Set<NotaFiscalStatusType>([
  NotaFiscalStatus.EMITIDA,
  NotaFiscalStatus.CANCELADA,
  NotaFiscalStatus.REJEITADA,
]);

// ─── Função guard ─────────────────────────────────────────────────────────────

/**
 * Verifica se a transição é permitida.
 * Lança `FiscalConflictError` se inválida.
 */
export function assertCanTransition(
  from: NotaFiscalStatusType,
  to: NotaFiscalStatusType,
  notaId?: number,
): void {
  const allowed = TRANSICOES[from] ?? [];
  if (!allowed.includes(to)) {
    throw new FiscalConflictError(
      `Transição inválida de "${from}" para "${to}" ${notaId ? `(nota id=${notaId})` : ''}.`,
      { from, to, allowed, notaId },
    );
  }
}

/**
 * Retorna se a transição é permitida sem lançar exceção.
 */
export function canTransition(
  from: NotaFiscalStatusType,
  to: NotaFiscalStatusType,
): boolean {
  return (TRANSICOES[from] ?? []).includes(to);
}

/**
 * Retorna true se o status é terminal (imutável).
 */
export function isTerminalStatus(status: NotaFiscalStatusType): boolean {
  return ESTADOS_TERMINAIS.has(status);
}

/**
 * Retorna os próximos estados possíveis a partir de `status`.
 */
export function getNextStates(status: NotaFiscalStatusType): NotaFiscalStatusType[] {
  return [...(TRANSICOES[status] ?? [])];
}

/**
 * Mapeia status do provider externo para status interno.
 */
export function mapProviderStatus(
  providerStatus: 'emitida' | 'pendente' | 'erro' | string,
): NotaFiscalStatusType {
  switch (providerStatus) {
    case 'emitida':  return NotaFiscalStatus.EMITIDA;
    case 'pendente': return NotaFiscalStatus.EM_PROCESSAMENTO;
    case 'erro':     return NotaFiscalStatus.ERRO_INTEGRACAO;
    default:         return NotaFiscalStatus.ERRO_INTEGRACAO;
  }
}
