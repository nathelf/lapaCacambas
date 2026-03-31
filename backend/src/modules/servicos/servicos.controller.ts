import { Router, type Request, type Response, type NextFunction } from 'express';
import * as servicosService from './servicos.service';

export const servicosRouter = Router();

// GET /api/servicos?apenasAtivos=true
servicosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apenasAtivos = req.query.apenasAtivos === 'true';
    const data = await servicosService.listar(apenasAtivos);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/servicos/:id
servicosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await servicosService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Serviço não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/servicos
servicosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await servicosService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/servicos/:id
servicosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await servicosService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/servicos/:id/toggle — ativa ou desativa o serviço
servicosRouter.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const servico = await servicosService.buscarPorId(id);
    const data = await servicosService.atualizar(id, { ativo: !servico.ativo });
    res.json(data);
  } catch (err) {
    next(err);
  }
});
