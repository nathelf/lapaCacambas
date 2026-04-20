import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { FiscalError } from '../modules/fiscal/fiscal.errors';

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId ?? 'unknown';

  // ─── Erros do módulo fiscal (hierarquia própria) ──────────────────────────
  if (err instanceof FiscalError) {
    return res.status(err.httpStatus).json({
      ...err.toJSON(),
      correlationId,
    });
  }

  // ─── Erros de validação Zod (payload inválido) ────────────────────────────
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload inválido.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      correlationId,
    });
  }

  // ─── Erros genéricos ──────────────────────────────────────────────────────
  const message = err instanceof Error ? err.message : 'Erro interno.';

  // Nunca expor stack trace em produção
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${correlationId}] Unhandled error:`, err);
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
    correlationId,
  });
}
