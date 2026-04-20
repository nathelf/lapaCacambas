import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Injeta X-Correlation-ID em cada request.
 * Lê do header se enviado pelo cliente; gera novo se ausente.
 * Propaga no header de resposta para rastreamento end-to-end.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-correlation-id'];
  const id = (Array.isArray(existing) ? existing[0] : existing)
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  req.correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  next();
}
