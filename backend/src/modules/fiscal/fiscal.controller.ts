import { Router } from 'express';
import { z } from 'zod';
import { FiscalAuditService } from './fiscal.audit.service';
import { FiscalAuthService } from './fiscal.auth.service';
import { FiscalIdempotencyService } from './fiscal.idempotency.service';
import { FiscalMapper } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import { FiscalService } from './fiscal.service';
import { FiscalValidationService } from './fiscal.validation.service';
import { FiscalNotFoundError } from './fiscal.errors';

const previewSchema = z.object({
  pedidoIds: z.array(z.union([z.string(), z.number()])).min(1),
  faturaId: z.union([z.string(), z.number()]).optional().nullable(),
});

const emitirSchema = z.object({
  pedidoIds: z.array(z.union([z.string(), z.number()])).min(1),
  faturaId: z.union([z.string(), z.number()]).optional().nullable(),
  forcarEmissao: z.boolean().optional().default(false),
  observacoesFiscais: z.string().max(2000).optional().nullable(),
});

const cancelSchema = z.object({
  reason: z.string().min(1).max(1000).default('Cancelamento solicitado pelo usuário'),
});

// ─── Instanciação dos serviços ────────────────────────────────────────────────
const repository = new FiscalRepository();
const validationService = new FiscalValidationService(repository);
const authService = new FiscalAuthService(repository);
const mapper = new FiscalMapper();
const idempotencyService = new FiscalIdempotencyService(repository);
const auditService = new FiscalAuditService();
const service = new FiscalService(
  repository,
  validationService,
  authService,
  mapper,
  idempotencyService,
  auditService,
);

export const fiscalRouter = Router();

// ─── POST /validar-pedido/:pedidoId ──────────────────────────────────────────
fiscalRouter.post('/validar-pedido/:pedidoId', async (req, res, next) => {
  try {
    const pedidoId = Number(req.params.pedidoId);
    const result = await service.validarPedido(pedidoId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── POST /preview ────────────────────────────────────────────────────────────
fiscalRouter.post('/preview', async (req, res, next) => {
  try {
    const payload = previewSchema.parse(req.body);
    const pedidoIds = payload.pedidoIds.map(Number);
    const faturaId = payload.faturaId ? Number(payload.faturaId) : null;
    const result = await service.preview(pedidoIds, faturaId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── POST /emitir ─────────────────────────────────────────────────────────────
fiscalRouter.post('/emitir', async (req, res, next) => {
  try {
    const payload = emitirSchema.parse(req.body);
    const userId = req.user!.id;
    const correlationId = req.correlationId;
    const result = await service.emitir(payload, userId, correlationId);
    const status = result.ok ? 200 : 422;
    res.status(status).json({ success: result.ok, data: result, correlationId });
  } catch (error) {
    next(error);
  }
});

// ─── GET /notas ───────────────────────────────────────────────────────────────
fiscalRouter.get('/notas', async (req, res, next) => {
  try {
    const result = await service.listarNotas({
      status: req.query.status ? String(req.query.status) : undefined,
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      pedidoId: req.query.pedidoId ? Number(req.query.pedidoId) : undefined,
      faturaId: req.query.faturaId ? Number(req.query.faturaId) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── GET /notas/:id ───────────────────────────────────────────────────────────
fiscalRouter.get('/notas/:id', async (req, res, next) => {
  try {
    const result = await service.detalharNota(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── GET /notas/:id/eventos ───────────────────────────────────────────────────
fiscalRouter.get('/notas/:id/eventos', async (req, res, next) => {
  try {
    const result = await service.getHistoricoEventos(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── GET /notas/:id/status ────────────────────────────────────────────────────
fiscalRouter.get('/notas/:id/status', async (req, res, next) => {
  try {
    const result = await service.consultarStatusNota(Number(req.params.id), req.correlationId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ─── POST /notas/:id/cancelar ─────────────────────────────────────────────────
fiscalRouter.post('/notas/:id/cancelar', async (req, res, next) => {
  try {
    const body = cancelSchema.parse(req.body);
    const result = await service.cancelarNota(
      Number(req.params.id),
      body.reason,
      req.user!.id,
      req.correlationId,
    );
    res.json({ success: true, data: result, correlationId: req.correlationId });
  } catch (error) {
    next(error);
  }
});

// ─── GET /notas/:id/xml ───────────────────────────────────────────────────────
fiscalRouter.get('/notas/:id/xml', async (req, res, next) => {
  try {
    const url = await service.getXmlUrl(Number(req.params.id));
    if (!url) throw new FiscalNotFoundError('XML da nota fiscal', Number(req.params.id));
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

// ─── GET /notas/:id/pdf ───────────────────────────────────────────────────────
fiscalRouter.get('/notas/:id/pdf', async (req, res, next) => {
  try {
    const url = await service.getPdfUrl(Number(req.params.id));
    if (!url) throw new FiscalNotFoundError('PDF da nota fiscal', Number(req.params.id));
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});
