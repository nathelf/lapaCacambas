import { Router, type Request, type Response, type NextFunction } from 'express';
import * as motoService from './motoristas.service';

export const motoristasRouter = Router();

// GET /api/motoristas?status=ativo&busca=joao
motoristasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await motoService.listar({
      status: req.query.status as any,
      busca: req.query.busca as string | undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/motoristas/:id
motoristasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await motoService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Motorista não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/motoristas
motoristasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await motoService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/motoristas/:id
motoristasRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await motoService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
