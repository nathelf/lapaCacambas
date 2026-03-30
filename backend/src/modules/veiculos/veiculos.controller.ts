import { Router, type Request, type Response, type NextFunction } from 'express';
import * as veiculosService from './veiculos.service';

export const veiculosRouter = Router();

// GET /api/veiculos?status=disponivel
veiculosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await veiculosService.listar({ status: req.query.status as any });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/veiculos/:id
veiculosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await veiculosService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Veículo não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/veiculos
veiculosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await veiculosService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/veiculos/:id
veiculosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await veiculosService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
