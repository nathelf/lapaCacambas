/**
 * Utilitário de retry com exponential backoff para chamadas ao provider fiscal.
 *
 * Regras:
 *  - 4xx (exceto 429): não retenta — erro do cliente, retentar não resolve.
 *  - 429 Rate-limited: respeita o header Retry-After se presente, caso contrário backoff.
 *  - 5xx e erros de rede/timeout: backoff exponencial (500ms * 2^tentativa).
 */
import { FiscalIntegrationError } from './fiscal.errors';
import { FiscalLogger } from './fiscal.logger';
import { FISCAL_LIMITS } from './fiscal.constants';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  correlationId?: string;
  label?: string;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function retryAfterMs(err: FiscalIntegrationError): number | null {
  const ra = (err.details as any)?.retryAfter;
  if (!ra) return null;
  const secs = Number(ra);
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : null;
}

function isClientError(httpStatus: number | undefined): boolean {
  return !!httpStatus && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = FISCAL_LIMITS.MAX_TENTATIVAS_RETRY,
    baseDelayMs = 500,
    correlationId,
    label = 'provider',
  } = opts;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const httpStatus =
        err instanceof FiscalIntegrationError
          ? ((err.details as any)?.httpStatus as number | undefined)
          : undefined;

      // Client errors (4xx except 429) — retry would not help
      if (isClientError(httpStatus)) throw err;

      // Last attempt — give up
      if (attempt >= maxAttempts) break;

      // Compute delay
      let delay = baseDelayMs * Math.pow(2, attempt - 1);
      if (httpStatus === 429 && err instanceof FiscalIntegrationError) {
        delay = retryAfterMs(err) ?? delay;
      }

      FiscalLogger.warn(`fiscal.${label}.retry`, {
        attempt,
        maxAttempts,
        next_attempt_in_ms: delay,
        http_status: httpStatus,
        correlationId,
        reason: err instanceof Error ? err.message : String(err),
      });

      await sleep(delay);
    }
  }

  throw lastError;
}
