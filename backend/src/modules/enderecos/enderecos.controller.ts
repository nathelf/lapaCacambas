import { Router, type Request, type Response, type NextFunction } from 'express';
import * as enderecosService from './enderecos.service';

export const enderecosRouter = Router();

// GET /api/enderecos?clienteId=1&obraId=2
enderecosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await enderecosService.listar({
      clienteId: req.query.clienteId ? Number(req.query.clienteId) : undefined,
      obraId: req.query.obraId ? Number(req.query.obraId) : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/enderecos/:id
enderecosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await enderecosService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Endereço não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/enderecos
enderecosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await enderecosService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/enderecos/:id
enderecosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await enderecosService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/enderecos/:id
enderecosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    await enderecosService.deletar(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
