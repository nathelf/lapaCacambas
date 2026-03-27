import express from 'express';
import cors from 'cors';
import { fiscalRouter } from './modules/fiscal/fiscal.controller';
import { financeiroRouter, webhookRouter } from './modules/boleto/financeiro.controller';
import { requireAuth } from './middlewares/auth.middleware';
import { errorMiddleware } from './middlewares/error.middleware';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'fiscal-backend' });
  });

  app.use('/api/fiscal', requireAuth(['administrador', 'fiscal', 'gestor', 'atendimento']), fiscalRouter);
  app.use('/api', webhookRouter);
  app.use('/api', requireAuth(['administrador', 'financeiro', 'fiscal', 'gestor', 'atendimento']), financeiroRouter);

  app.use(errorMiddleware);
  return app;
}

