import { Router, type Request, type Response, type NextFunction } from 'express';
import * as obrasService from './obras.service';

export const obrasRouter = Router();

// GET /api/obras?clienteId=1&ativa=true
obrasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await obrasService.listar({
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      ativa: req.query.ativa !== undefined ? req.query.ativa === 'true' : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/obras/:id
obrasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await obrasService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Obra não encontrada.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/obras
obrasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await obrasService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/obras/:id
obrasRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await obrasService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/obras/:id
obrasRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    await obrasService.deletar(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
