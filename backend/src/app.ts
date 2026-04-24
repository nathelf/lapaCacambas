import express from 'express';
import cors from 'cors';
import { fiscalRouter } from './modules/fiscal/fiscal.controller';
import { clientesRouter } from './modules/clientes/clientes.controller';
import { cacambasRouter } from './modules/cacambas/cacambas.controller';
import { veiculosRouter } from './modules/veiculos/veiculos.controller';
import { maquinasRouter } from './modules/maquinas/maquinas.controller';
import { motoristasRouter } from './modules/motoristas/motoristas.controller';
import { obrasRouter } from './modules/obras/obras.controller';
import { enderecosRouter } from './modules/enderecos/enderecos.controller';
import { contatosRouter } from './modules/contatos/contatos.controller';
import { servicosRouter } from './modules/servicos/servicos.controller';
import { financeiroRouter, webhookRouter } from './modules/boleto/financeiro.controller';
import { pedidosRouter } from './modules/pedidos/pedidos.controller';
import { logisticaRouter } from './modules/logistica/logistica.controller';
import { authRouter } from './modules/auth/auth.controller';
import { usuariosRouter } from './modules/usuarios/usuarios.controller';
import { relatoriosRouter } from './modules/relatorios/relatorios.controller';
import { requireAuth } from './middlewares/auth.middleware';
import { correlationMiddleware } from './middlewares/correlation.middleware';
import { errorMiddleware } from './middlewares/error.middleware';

export function createApp() {
  const app = express();
  app.use(
    cors({
      exposedHeaders: ['Location', 'Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  // Correlation ID — deve vir antes de qualquer rota
  app.use(correlationMiddleware);

  // Garante charset=utf-8 em todas as respostas JSON
  app.use((_req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'fiscal-backend' });
  });

  // Rotas de autenticação — públicas (login/refresh) e protegidas (logout/me)
  app.use('/api/auth', authRouter);

  app.use('/api/clientes', requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal']), clientesRouter);
  app.use('/api/cacambas', requireAuth(['administrador', 'atendimento', 'gestor', 'operador']), cacambasRouter);
  app.use('/api/veiculos', requireAuth(['administrador', 'gestor', 'operador']), veiculosRouter);
  app.use('/api/maquinas', requireAuth(['administrador', 'gestor', 'operador']), maquinasRouter);
  app.use('/api/motoristas', requireAuth(['administrador', 'gestor', 'operador']), motoristasRouter);
  app.use('/api/obras', requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal']), obrasRouter);
  app.use('/api/enderecos', requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal']), enderecosRouter);
  app.use('/api/contatos', requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal']), contatosRouter);
  app.use('/api/servicos', requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal']), servicosRouter);
  app.use('/api/pedidos', requireAuth(['administrador', 'atendimento', 'gestor', 'fiscal', 'operador']), pedidosRouter);
  app.use('/api/usuarios', requireAuth([]), usuariosRouter);
  app.use('/api/relatorios', requireAuth(['administrador', 'financeiro', 'fiscal', 'gestor', 'atendimento']), relatoriosRouter);
  // Inclui `motorista` para /motorista/minhas-os e ações de campo (retirar/entregar/coletar/pátio).
  app.use(
    '/api/logistica',
    requireAuth(['administrador', 'gestor', 'operador', 'atendimento', 'motorista']),
    logisticaRouter,
  );
  app.use('/api/fiscal', requireAuth(['administrador', 'fiscal', 'gestor', 'atendimento']), fiscalRouter);
  app.use('/api', webhookRouter);
  app.use('/api', requireAuth(['administrador', 'financeiro', 'fiscal', 'gestor', 'atendimento']), financeiroRouter);

  app.use(errorMiddleware);
  return app;
}

