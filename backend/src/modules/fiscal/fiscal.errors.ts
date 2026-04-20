/**
 * Hierarquia de erros do módulo fiscal.
 * Cada classe define o httpStatus correto e um code rastreável.
 * O controller usa `instanceof` para montar resposta padronizada.
 */

export interface FiscalErrorDetails {
  [key: string]: unknown;
}

// ─── Base ─────────────────────────────────────────────────────────────────────
export class FiscalError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: FiscalErrorDetails,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details ?? {},
      },
    };
  }
}

// ─── 400 Validação ────────────────────────────────────────────────────────────
export class FiscalValidationError extends FiscalError {
  constructor(message: string, details?: FiscalErrorDetails) {
    super('FISCAL_VALIDATION_ERROR', message, 400, details);
  }
}

// ─── 404 Não encontrado ───────────────────────────────────────────────────────
export class FiscalNotFoundError extends FiscalError {
  constructor(resource: string, id?: number | string) {
    super(
      'FISCAL_NOT_FOUND',
      `${resource}${id !== undefined ? ` id=${id}` : ''} não encontrado.`,
      404,
      id !== undefined ? { resource, id } : { resource },
    );
  }
}

// ─── 409 Conflito / duplicidade ───────────────────────────────────────────────
export class FiscalConflictError extends FiscalError {
  constructor(message: string, details?: FiscalErrorDetails) {
    super('FISCAL_CONFLICT', message, 409, details);
  }
}

// ─── 422 Configuração inválida ────────────────────────────────────────────────
export class FiscalConfigurationError extends FiscalError {
  constructor(message: string, details?: FiscalErrorDetails) {
    super('FISCAL_CONFIGURATION_ERROR', message, 422, details);
  }
}

// ─── 401/403 Autenticação do provider ────────────────────────────────────────
export class FiscalAuthenticationError extends FiscalError {
  constructor(message: string, details?: FiscalErrorDetails) {
    super('FISCAL_AUTHENTICATION_ERROR', message, 502, details);
  }
}

// ─── 502 Falha no provider externo ───────────────────────────────────────────
export class FiscalIntegrationError extends FiscalError {
  constructor(message: string, details?: FiscalErrorDetails) {
    super('FISCAL_INTEGRATION_ERROR', message, 502, details);
  }
}

// ─── 423 Lock / idempotência em processamento ────────────────────────────────
export class FiscalProcessingError extends FiscalError {
  constructor(message: string, details?: FiscalErrorDetails) {
    super('FISCAL_PROCESSING_LOCKED', message, 423, details);
  }
}
