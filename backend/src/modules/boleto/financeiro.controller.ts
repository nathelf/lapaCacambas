import { Router } from 'express';
import { z } from 'zod';
import { BancoAuthService } from './banco.auth.service';
import { BancoMapper } from './banco.mapper';
import { BoletoRepository } from './boleto.repository';
import { BoletoService } from './boleto.service';
import { BoletoValidationService } from './boleto.validation.service';

const createSchema = z.object({
  cliente_id: z.number(),
  pedido_id: z.number().optional().nullable(),
  fatura_id: z.number().optional().nullable(),
  banco: z.string().optional().nullable(),
  valor: z.number().positive(),
  data_vencimento: z.string().min(8),
  descricao: z.string().optional().nullable(),
  valor_multa: z.number().optional(),
  valor_juros: z.number().optional(),
  observacao: z.string().optional().nullable(),
});

const cancelSchema = z.object({
  reason: z.string().min(5).max(1000),
});

const repo = new BoletoRepository();
const validation = new BoletoValidationService(repo);
const auth = new BancoAuthService(repo);
const mapper = new BancoMapper();
const service = new BoletoService(repo, validation, auth, mapper);

export const financeiroRouter = Router();

financeiroRouter.post('/boletos', async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const result = await service.criar(payload, req.user!.id);
    res.status(result.ok ? 201 : 400).json(result);
  } catch (err) {
    next(err);
  }
});

financeiroRouter.post('/boletos/:id/emitir', async (req, res, next) => {
  try {
    const result = await service.emitir(Number(req.params.id), req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

financeiroRouter.get('/boletos', async (req, res, next) => {
  try {
    const result = await service.listar({
      status: req.query.status ? String(req.query.status) : undefined,
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      pedidoId: req.query.pedidoId ? Number(req.query.pedidoId) : undefined,
      faturaId: req.query.faturaId ? Number(req.query.faturaId) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

financeiroRouter.get('/boletos/:id', async (req, res, next) => {
  try {
    const result = await service.detalhar(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

financeiroRouter.get('/boletos/:id/status', async (req, res, next) => {
  try {
    const result = await service.consultarStatus(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

financeiroRouter.post('/boletos/:id/cancelar', async (req, res, next) => {
  try {
    const body = cancelSchema.parse(req.body);
    const result = await service.cancelar(Number(req.params.id), body.reason, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export const webhookRouter = Router();
webhookRouter.post('/boletos/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'] ? String(req.headers['x-webhook-signature']) : null;
    const result = await service.webhookPagamento(req.body || {}, signature);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

