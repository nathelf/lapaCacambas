/**
 * Testes do serviço de idempotência fiscal.
 * Verifica construção de chaves e comportamento de verificação.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FiscalIdempotencyService } from '../fiscal.idempotency.service';
import { FiscalConflictError } from '../fiscal.errors';
import { NotaFiscalStatus } from '../fiscal.constants';
import type { FiscalRepository } from '../fiscal.repository';

// ─── Mock do repositório ────────────────────────────────────────────────────

function makeRepo(notaExistente: Record<string, unknown> | null = null): FiscalRepository {
  return {
    findNotaByIdempotencyKey: vi.fn().mockResolvedValue(notaExistente),
  } as unknown as FiscalRepository;
}

describe('FiscalIdempotencyService', () => {
  let service: FiscalIdempotencyService;

  // ─── buildKey ─────────────────────────────────────────────────────────────

  describe('buildKey()', () => {
    beforeEach(() => {
      service = new FiscalIdempotencyService(makeRepo());
    });

    it('retorna chave com prefixo nf_', () => {
      const key = service.buildKey([1, 2], null);
      expect(key).toMatch(/^nf_[a-f0-9]{32}$/);
    });

    it('é determinística para mesmo input', () => {
      const k1 = service.buildKey([1, 2, 3], 10);
      const k2 = service.buildKey([1, 2, 3], 10);
      expect(k1).toBe(k2);
    });

    it('ordem dos pedidoIds não importa (canonical sort)', () => {
      const k1 = service.buildKey([3, 1, 2], null);
      const k2 = service.buildKey([1, 2, 3], null);
      expect(k1).toBe(k2);
    });

    it('muda com faturaId diferente', () => {
      const k1 = service.buildKey([1], 10);
      const k2 = service.buildKey([1], 11);
      expect(k1).not.toBe(k2);
    });

    it('muda com observações diferentes', () => {
      const k1 = service.buildKey([1], null, 'obs A');
      const k2 = service.buildKey([1], null, 'obs B');
      expect(k1).not.toBe(k2);
    });

    it('observação em branco e sem observação geram mesma chave', () => {
      const k1 = service.buildKey([1], null, '');
      const k2 = service.buildKey([1], null, undefined);
      expect(k1).toBe(k2);
    });

    it('normaliza observação (case insensitive, trim)', () => {
      const k1 = service.buildKey([1], null, '  Teste  ');
      const k2 = service.buildKey([1], null, 'teste');
      expect(k1).toBe(k2);
    });
  });

  // ─── check() — nenhuma nota existente ─────────────────────────────────────

  describe('check() — sem nota existente', () => {
    beforeEach(() => {
      service = new FiscalIdempotencyService(makeRepo(null));
    });

    it('retorna shouldProceed=true e isIdempotentHit=false', async () => {
      const result = await service.check('nf_abc123');
      expect(result.shouldProceed).toBe(true);
      expect(result.isIdempotentHit).toBe(false);
      expect(result.existingNota).toBeNull();
    });
  });

  // ─── check() — nota emitida ────────────────────────────────────────────────

  describe('check() — nota já emitida', () => {
    beforeEach(() => {
      service = new FiscalIdempotencyService(
        makeRepo({ id: 1, status: NotaFiscalStatus.EMITIDA }),
      );
    });

    it('retorna shouldProceed=false e isIdempotentHit=true', async () => {
      const result = await service.check('nf_abc123');
      expect(result.shouldProceed).toBe(false);
      expect(result.isIdempotentHit).toBe(true);
      expect(result.existingNota).not.toBeNull();
    });
  });

  // ─── check() — nota cancelada ──────────────────────────────────────────────

  describe('check() — nota cancelada', () => {
    beforeEach(() => {
      service = new FiscalIdempotencyService(
        makeRepo({ id: 2, status: NotaFiscalStatus.CANCELADA }),
      );
    });

    it('retorna shouldProceed=false (não reprocessa cancelada)', async () => {
      const result = await service.check('nf_abc123');
      expect(result.shouldProceed).toBe(false);
    });
  });

  // ─── check() — nota em processamento (423 Lock) ────────────────────────────

  describe('check() — nota em processamento ativo', () => {
    it('lança FiscalConflictError para status VALIDANDO', async () => {
      service = new FiscalIdempotencyService(
        makeRepo({ id: 3, status: NotaFiscalStatus.VALIDANDO }),
      );
      await expect(service.check('nf_abc123')).rejects.toThrow(FiscalConflictError);
    });

    it('lança FiscalConflictError para status EM_PROCESSAMENTO', async () => {
      service = new FiscalIdempotencyService(
        makeRepo({ id: 4, status: NotaFiscalStatus.EM_PROCESSAMENTO }),
      );
      await expect(service.check('nf_abc123')).rejects.toThrow(FiscalConflictError);
    });
  });

  // ─── check() — nota com erro de integração (retry permitido) ──────────────

  describe('check() — nota com erro de integração', () => {
    beforeEach(() => {
      service = new FiscalIdempotencyService(
        makeRepo({ id: 5, status: NotaFiscalStatus.ERRO_INTEGRACAO }),
      );
    });

    it('retorna shouldProceed=true para permitir retry', async () => {
      const result = await service.check('nf_abc123');
      expect(result.shouldProceed).toBe(true);
      expect(result.isIdempotentHit).toBe(false);
    });
  });
});
