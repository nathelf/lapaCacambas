import { Router, type Request, type Response, type NextFunction } from 'express';
import * as usuariosService from './usuarios.service';

export const usuariosRouter = Router();

// GET /api/usuarios?busca=
usuariosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usuariosService.listar({
      busca: req.query.busca as string | undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/usuarios/:id
usuariosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usuariosService.buscarPorId(req.params.id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Usuário não encontrado.') {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// POST /api/usuarios
usuariosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usuariosService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/usuarios/:id
usuariosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usuariosService.atualizar(req.params.id, req.body);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Usuário não encontrado.') {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// PATCH /api/usuarios/:id/status
usuariosRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usuariosService.patchStatus(req.params.id, req.body);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Usuário não encontrado.') {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// DELETE /api/usuarios/:id
usuariosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usuariosService.remover(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === 'Usuário não encontrado.') {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
});
