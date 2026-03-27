import { Router } from 'express';
import { z } from 'zod';
import { FiscalMapper } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import { FiscalService } from './fiscal.service';
import { FiscalValidationService } from './fiscal.validation.service';
import { FiscalAuthService } from './fiscal.auth.service';

const previewSchema = z.object({
  pedidoIds: z.array(z.union([z.string(), z.number()])).min(1),
  faturaId: z.union([z.string(), z.number()]).optional().nullable(),
});

const emitirSchema = z.object({
  pedidoIds: z.array(z.union([z.string(), z.number()])).min(1),
  faturaId: z.union([z.string(), z.number()]).optional().nullable(),
  forcarEmissao: z.boolean().optional().default(false),
  observacoesFiscais: z.string().max(2000).optional(),
});

const cancelSchema = z.object({
  reason: z.string().min(5).max(1000),
});

const repository = new FiscalRepository();
const validationService = new FiscalValidationService(repository);
const authService = new FiscalAuthService(repository);
const mapper = new FiscalMapper();
const service = new FiscalService(repository, validationService, authService, mapper);

export const fiscalRouter = Router();

fiscalRouter.post('/validar-pedido/:pedidoId', async (req, res, next) => {
  try {
    const pedidoId = Number(req.params.pedidoId);
    const result = await service.validarPedido(pedidoId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.post('/preview', async (req, res, next) => {
  try {
    const payload = previewSchema.parse(req.body);
    const pedidoIds = payload.pedidoIds.map(Number);
    const faturaId = payload.faturaId ? Number(payload.faturaId) : null;
    const result = await service.preview(pedidoIds, faturaId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.post('/emitir', async (req, res, next) => {
  try {
    const payload = emitirSchema.parse(req.body);
    const userId = req.user!.id;
    const result = await service.emitir(payload, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.get('/notas', async (req, res, next) => {
  try {
    const result = await service.listarNotas({
      status: req.query.status ? String(req.query.status) : undefined,
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      pedidoId: req.query.pedidoId ? Number(req.query.pedidoId) : undefined,
      faturaId: req.query.faturaId ? Number(req.query.faturaId) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.get('/notas/:id', async (req, res, next) => {
  try {
    const result = await service.detalharNota(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.get('/notas/:id/status', async (req, res, next) => {
  try {
    const result = await service.consultarStatusNota(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.post('/notas/:id/cancelar', async (req, res, next) => {
  try {
    const body = cancelSchema.parse(req.body);
    const result = await service.cancelarNota(Number(req.params.id), body.reason, req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.get('/notas/:id/xml', async (req, res, next) => {
  try {
    const url = await service.getXmlUrl(Number(req.params.id));
    if (!url) return res.status(404).json({ message: 'XML não disponível.' });
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

fiscalRouter.get('/notas/:id/pdf', async (req, res, next) => {
  try {
    const url = await service.getPdfUrl(Number(req.params.id));
    if (!url) return res.status(404).json({ message: 'PDF não disponível.' });
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

