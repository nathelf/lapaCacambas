/**
 * Testes da hierarquia de erros fiscais.
 * Verifica httpStatus, codes e formato de serialização.
 */
import { describe, it, expect } from 'vitest';
import {
  FiscalError,
  FiscalValidationError,
  FiscalNotFoundError,
  FiscalConflictError,
  FiscalConfigurationError,
  FiscalAuthenticationError,
  FiscalIntegrationError,
  FiscalProcessingError,
} from '../fiscal.errors';

describe('Hierarquia de erros fiscais', () => {

  it('FiscalValidationError → httpStatus 400', () => {
    const err = new FiscalValidationError('campo inválido');
    expect(err.httpStatus).toBe(400);
    expect(err.code).toBe('FISCAL_VALIDATION_ERROR');
    expect(err instanceof FiscalError).toBe(true);
  });

  it('FiscalNotFoundError → httpStatus 404 com resource e id', () => {
    const err = new FiscalNotFoundError('Nota fiscal', 42);
    expect(err.httpStatus).toBe(404);
    expect(err.code).toBe('FISCAL_NOT_FOUND');
    expect(err.message).toContain('42');
    expect(err.details).toMatchObject({ resource: 'Nota fiscal', id: 42 });
  });

  it('FiscalConflictError → httpStatus 409', () => {
    const err = new FiscalConflictError('Duplicado', { key: 'nf_abc' });
    expect(err.httpStatus).toBe(409);
    expect(err.details).toMatchObject({ key: 'nf_abc' });
  });

  it('FiscalConfigurationError → httpStatus 422', () => {
    const err = new FiscalConfigurationError('Sem configuração ativa');
    expect(err.httpStatus).toBe(422);
  });

  it('FiscalAuthenticationError → httpStatus 502', () => {
    const err = new FiscalAuthenticationError('Token inválido');
    expect(err.httpStatus).toBe(502);
  });

  it('FiscalIntegrationError → httpStatus 502', () => {
    const err = new FiscalIntegrationError('Timeout do provider');
    expect(err.httpStatus).toBe(502);
  });

  it('FiscalProcessingError → httpStatus 423', () => {
    const err = new FiscalProcessingError('Nota em processamento');
    expect(err.httpStatus).toBe(423);
  });

  it('toJSON() retorna formato padronizado { success, error }', () => {
    const err = new FiscalValidationError('campo X inválido', { field: 'x' });
    const json = err.toJSON();
    expect(json).toMatchObject({
      success: false,
      error: {
        code: 'FISCAL_VALIDATION_ERROR',
        message: 'campo X inválido',
        details: { field: 'x' },
      },
    });
  });

  it('FiscalError.name é o nome da subclasse (para logs)', () => {
    const err = new FiscalConflictError('conflito');
    expect(err.name).toBe('FiscalConflictError');
  });
});
