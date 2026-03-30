import { Router, type Request, type Response, type NextFunction } from 'express';
import * as clientesService from './clientes.service';
import type { ListClientesQuery } from './clientes.types';

export const clientesRouter = Router();

// GET /api/clientes?busca=...&status=...&tipo=...&page=1&limit=50
clientesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: ListClientesQuery = {
      busca: req.query.busca as string | undefined,
      status: req.query.status as any,
      tipo: req.query.tipo as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await clientesService.listar(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/clientes/:id
clientesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const cliente = await clientesService.buscarPorId(id);
    res.json(cliente);
  } catch (err: any) {
    if (err.message === 'Cliente não encontrado.') {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// POST /api/clientes
clientesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cliente = await clientesService.criar(req.body, req.user!.id);
    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
});

// PUT /api/clientes/:id
clientesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const cliente = await clientesService.atualizar(id, req.body, req.user!.id);
    res.json(cliente);
  } catch (err: any) {
    if (err.message === 'Falha ao atualizar cliente.') {
      res.status(404).json({ message: 'Cliente não encontrado.' });
      return;
    }
    next(err);
  }
});

// DELETE /api/clientes/:id
clientesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    await clientesService.deletar(id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
