import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Payload inválido.',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const message = err instanceof Error ? err.message : 'Erro interno.';
  return res.status(500).json({
    message,
  });
}

