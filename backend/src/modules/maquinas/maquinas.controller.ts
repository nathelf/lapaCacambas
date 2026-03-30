import { Router, type Request, type Response, type NextFunction } from 'express';
import * as maquinasService from './maquinas.service';

export const maquinasRouter = Router();

// GET /api/maquinas?status=disponivel
maquinasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await maquinasService.listar({ status: req.query.status as string | undefined });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/maquinas/:id
maquinasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await maquinasService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Máquina não encontrada.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/maquinas
maquinasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await maquinasService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/maquinas/:id
maquinasRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await maquinasService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
