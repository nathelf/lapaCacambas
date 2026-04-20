/**
 * Testes da máquina de estados fiscal.
 * Garante que transições válidas e inválidas se comportam corretamente.
 */
import { describe, it, expect } from 'vitest';
import {
  assertCanTransition,
  canTransition,
  isTerminalStatus,
  getNextStates,
  mapProviderStatus,
} from '../fiscal.status-machine';
import { NotaFiscalStatus } from '../fiscal.constants';
import { FiscalConflictError } from '../fiscal.errors';

describe('fiscal.status-machine', () => {
  // ─── canTransition ──────────────────────────────────────────────────────────

  describe('canTransition()', () => {
    it('permite PENDENTE → VALIDANDO', () => {
      expect(canTransition(NotaFiscalStatus.PENDENTE, NotaFiscalStatus.VALIDANDO)).toBe(true);
    });

    it('permite EM_PROCESSAMENTO → EMITIDA', () => {
      expect(canTransition(NotaFiscalStatus.EM_PROCESSAMENTO, NotaFiscalStatus.EMITIDA)).toBe(true);
    });

    it('permite EMITIDA → CANCELAMENTO_SOLICITADO', () => {
      expect(canTransition(NotaFiscalStatus.EMITIDA, NotaFiscalStatus.CANCELAMENTO_SOLICITADO)).toBe(true);
    });

    it('permite ERRO_INTEGRACAO → EM_PROCESSAMENTO (retry)', () => {
      expect(canTransition(NotaFiscalStatus.ERRO_INTEGRACAO, NotaFiscalStatus.EM_PROCESSAMENTO)).toBe(true);
    });

    it('rejeita EMITIDA → PENDENTE (regressão inválida)', () => {
      expect(canTransition(NotaFiscalStatus.EMITIDA, NotaFiscalStatus.PENDENTE)).toBe(false);
    });

    it('rejeita CANCELADA → qualquer estado (terminal)', () => {
      expect(canTransition(NotaFiscalStatus.CANCELADA, NotaFiscalStatus.PENDENTE)).toBe(false);
      expect(canTransition(NotaFiscalStatus.CANCELADA, NotaFiscalStatus.EMITIDA)).toBe(false);
    });

    it('rejeita REJEITADA → qualquer estado (terminal)', () => {
      expect(canTransition(NotaFiscalStatus.REJEITADA, NotaFiscalStatus.PENDENTE)).toBe(false);
      expect(canTransition(NotaFiscalStatus.REJEITADA, NotaFiscalStatus.EM_PROCESSAMENTO)).toBe(false);
    });

    it('rejeita PENDENTE → EMITIDA (pula etapas)', () => {
      expect(canTransition(NotaFiscalStatus.PENDENTE, NotaFiscalStatus.EMITIDA)).toBe(false);
    });
  });

  // ─── assertCanTransition ───────────────────────────────────────────────────

  describe('assertCanTransition()', () => {
    it('não lança para transição válida', () => {
      expect(() =>
        assertCanTransition(NotaFiscalStatus.PENDENTE, NotaFiscalStatus.VALIDANDO),
      ).not.toThrow();
    });

    it('lança FiscalConflictError para transição inválida', () => {
      expect(() =>
        assertCanTransition(NotaFiscalStatus.EMITIDA, NotaFiscalStatus.PENDENTE),
      ).toThrow(FiscalConflictError);
    });

    it('inclui notaId na mensagem de erro quando fornecido', () => {
      try {
        assertCanTransition(NotaFiscalStatus.CANCELADA, NotaFiscalStatus.EMITIDA, 42);
        expect.fail('Deveria ter lançado');
      } catch (err) {
        expect(err).toBeInstanceOf(FiscalConflictError);
        expect((err as FiscalConflictError).message).toContain('42');
      }
    });

    it('lança com status 409', () => {
      try {
        assertCanTransition(NotaFiscalStatus.REJEITADA, NotaFiscalStatus.PENDENTE);
        expect.fail();
      } catch (err) {
        expect((err as FiscalConflictError).httpStatus).toBe(409);
      }
    });
  });

  // ─── isTerminalStatus ──────────────────────────────────────────────────────

  describe('isTerminalStatus()', () => {
    it.each([
      [NotaFiscalStatus.EMITIDA, true],
      [NotaFiscalStatus.CANCELADA, true],
      [NotaFiscalStatus.REJEITADA, true],
      [NotaFiscalStatus.PENDENTE, false],
      [NotaFiscalStatus.EM_PROCESSAMENTO, false],
      [NotaFiscalStatus.ERRO_INTEGRACAO, false],
    ])('%s → %s', (status, expected) => {
      expect(isTerminalStatus(status)).toBe(expected);
    });
  });

  // ─── getNextStates ─────────────────────────────────────────────────────────

  describe('getNextStates()', () => {
    it('retorna estados corretos para PENDENTE', () => {
      const next = getNextStates(NotaFiscalStatus.PENDENTE);
      expect(next).toContain(NotaFiscalStatus.VALIDANDO);
      expect(next).toContain(NotaFiscalStatus.REJEITADA);
    });

    it('retorna array vazio para CANCELADA (terminal)', () => {
      expect(getNextStates(NotaFiscalStatus.CANCELADA)).toHaveLength(0);
    });

    it('retorna array vazio para REJEITADA (terminal)', () => {
      expect(getNextStates(NotaFiscalStatus.REJEITADA)).toHaveLength(0);
    });
  });

  // ─── mapProviderStatus ─────────────────────────────────────────────────────

  describe('mapProviderStatus()', () => {
    it('mapeia "emitida" → EMITIDA', () => {
      expect(mapProviderStatus('emitida')).toBe(NotaFiscalStatus.EMITIDA);
    });

    it('mapeia "pendente" → EM_PROCESSAMENTO', () => {
      expect(mapProviderStatus('pendente')).toBe(NotaFiscalStatus.EM_PROCESSAMENTO);
    });

    it('mapeia "erro" → ERRO_INTEGRACAO', () => {
      expect(mapProviderStatus('erro')).toBe(NotaFiscalStatus.ERRO_INTEGRACAO);
    });

    it('mapeia status desconhecido → ERRO_INTEGRACAO (fallback defensivo)', () => {
      expect(mapProviderStatus('unknown_status_xyz')).toBe(NotaFiscalStatus.ERRO_INTEGRACAO);
    });
  });
});
