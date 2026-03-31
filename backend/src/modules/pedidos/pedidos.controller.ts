import { Router, type Request, type Response, type NextFunction } from 'express';
import * as pedidosService from './pedidos.service';
import type { ListPedidosQuery } from './pedidos.types';

export const pedidosRouter = Router();

// GET /api/pedidos?status=...&clienteId=...&busca=...&page=1&limit=50
pedidosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: ListPedidosQuery = {
      busca:      req.query.busca as string | undefined,
      status:     req.query.status as any,
      clienteId:  req.query.clienteId ? Number(req.query.clienteId) : undefined,
      dataInicio: req.query.dataInicio as string | undefined,
      dataFim:    req.query.dataFim as string | undefined,
      page:       req.query.page  ? Number(req.query.page)  : undefined,
      limit:      req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await pedidosService.listar(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/pedidos/:id
pedidosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const pedido = await pedidosService.buscarPorId(id);
    res.json(pedido);
  } catch (err: any) {
    if (err.message === 'Pedido não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/pedidos
pedidosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pedido = await pedidosService.criar(req.body, req.user!.id);
    res.status(201).json(pedido);
  } catch (err: any) {
    if (err.message.includes('inadimplente') || err.message.includes('Caçamba')) {
      res.status(422).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// PUT /api/pedidos/:id
pedidosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const pedido = await pedidosService.atualizar(id, req.body, req.user!.id);
    res.json(pedido);
  } catch (err: any) {
    if (err.message === 'Pedido não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// PATCH /api/pedidos/:id/status
pedidosRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const pedido = await pedidosService.mudarStatus(id, req.body, req.user!.id);
    res.json(pedido);
  } catch (err: any) {
    if (err.message === 'Pedido não encontrado.') { res.status(404).json({ message: err.message }); return; }
    if (err.message.includes('Transição')) { res.status(422).json({ message: err.message }); return; }
    next(err);
  }
});

// DELETE /api/pedidos/:id
pedidosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    await pedidosService.deletar(id, req.user!.id);
    res.status(204).send();
  } catch (err: any) {
    if (err.message.includes('não pode ser removido') || err.message === 'Pedido não encontrado.') {
      res.status(422).json({ message: err.message });
      return;
    }
    next(err);
  }
});
