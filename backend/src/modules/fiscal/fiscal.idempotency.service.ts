/**
 * Serviço de Idempotência Fiscal
 *
 * Problema resolvido: múltiplas requisições simultâneas com o mesmo payload
 * (clique duplo, retry do browser, re-deploy) não podem gerar notas duplicadas.
 *
 * Estratégia em duas camadas:
 *  1. Chave de idempotência derivada do hash do lote (SHA-256)
 *  2. Unique constraint no DB (external_id) — garante atomicidade mesmo em race condition
 *
 * Fluxo:
 *  - Antes de chamar o provider: verifica se já existe nota com essa chave
 *  - Se existe e status != ERRO_INTEGRACAO → retorna nota existente
 *  - Se existe com erro (erro | erro_integracao) → permite retry (nota será atualizada)
 *  - Se não existe → prossegue com emissão
 */
import { createHash } from 'node:crypto';
import type { FiscalRepository } from './fiscal.repository';
import { NotaFiscalStatus } from './fiscal.constants';
import { FiscalConflictError } from './fiscal.errors';

export interface IdempotencyCheckResult {
  /** Deve prosseguir com nova emissão? */
  shouldProceed: boolean;
  /** Nota já existente (se idempotência hit) */
  existingNota: Record<string, unknown> | null;
  /** A chave calculada */
  idempotencyKey: string;
  /** Se true = hit de idempotência */
  isIdempotentHit: boolean;
}

export class FiscalIdempotencyService {
  constructor(private readonly repo: FiscalRepository) {}

  /**
   * Gera chave de idempotência determinística a partir do lote.
   * Qualquer variação nos pedidos ou fatura gera chave diferente.
   */
  buildKey(pedidoIds: number[], faturaId: number | null, observacoes?: string | null): string {
    const canonical = JSON.stringify({
      pedidoIds: [...pedidoIds].sort((a, b) => a - b),
      faturaId: faturaId ?? null,
      observacoes: (observacoes ?? '').trim().toLowerCase(),
    });
    const hash = createHash('sha256').update(canonical).digest('hex').slice(0, 32);
    return `nf_${hash}`;
  }

  /**
   * Verifica estado de idempotência antes da emissão.
   *
   * Retorna:
   *  - shouldProceed=true  → nenhuma nota encontrada, prosseguir normalmente
   *  - shouldProceed=true  → nota em ERRO_INTEGRACAO, retry permitido
   *  - shouldProceed=false → nota já em status não-retryable, retornar existente
   *
   * Lança FiscalConflictError se a nota está em processamento ativo (VALIDANDO, EM_PROCESSAMENTO).
   */
  async check(idempotencyKey: string): Promise<IdempotencyCheckResult> {
    const existing = await this.repo.findNotaByIdempotencyKey(idempotencyKey);

    if (!existing) {
      return {
        shouldProceed: true,
        existingNota: null,
        idempotencyKey,
        isIdempotentHit: false,
      };
    }

    const status = existing.status as string;

    // Nota em processamento ativo — bloquear nova tentativa (423 Locked)
    if (
      status === NotaFiscalStatus.VALIDANDO ||
      status === NotaFiscalStatus.EM_PROCESSAMENTO
    ) {
      throw new FiscalConflictError(
        `Nota fiscal já em processamento (status="${status}"). Aguarde alguns segundos e tente de novo — requisições em paralelo ou duplo clique geram conflito (HTTP 409).`,
        { idempotencyKey, notaId: existing.id, status },
      );
    }

    // Nota já emitida ou cancelada — retornar sem reprocessar
    if (
      status === NotaFiscalStatus.EMITIDA ||
      status === NotaFiscalStatus.CANCELADA ||
      status === NotaFiscalStatus.REJEITADA
    ) {
      return {
        shouldProceed: false,
        existingNota: existing as Record<string, unknown>,
        idempotencyKey,
        isIdempotentHit: true,
      };
    }

    // Falha de emissão / integração — mesmo external_id, atualiza a linha existente (retry)
    if (status === NotaFiscalStatus.ERRO_INTEGRACAO || status === 'erro') {
      return {
        shouldProceed: true,
        existingNota: existing as Record<string, unknown>,
        idempotencyKey,
        isIdempotentHit: false,
      };
    }

    // Existe registro com status inesperado — não duplicar INSERT (evita 409 em external_id)
    return {
      shouldProceed: false,
      existingNota: existing as Record<string, unknown>,
      idempotencyKey,
      isIdempotentHit: true,
    };
  }
}
