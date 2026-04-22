import { Router, type Request, type Response, type NextFunction } from 'express';
import { requirePermission } from '../../middlewares/permission.middleware';
import * as usuariosService from './usuarios.service';

export const usuariosRouter = Router();

// GET /api/usuarios — requer usuarios.visualizar
usuariosRouter.get(
  '/',
  requirePermission('usuarios.visualizar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usuariosService.listar({
        busca: req.query.busca as string | undefined,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/usuarios/:id — requer usuarios.visualizar
usuariosRouter.get(
  '/:id',
  requirePermission('usuarios.visualizar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usuariosService.buscarPorId(req.params.id);
      res.json(data);
    } catch (err: any) {
      if (err.message === 'Usuário não encontrado.') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
        return;
      }
      next(err);
    }
  },
);

// POST /api/usuarios — requer usuarios.criar
usuariosRouter.post(
  '/',
  requirePermission('usuarios.criar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usuariosService.criar(req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/usuarios/:id — requer usuarios.editar
usuariosRouter.put(
  '/:id',
  requirePermission('usuarios.editar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usuariosService.atualizar(req.params.id, req.body);
      res.json(data);
    } catch (err: any) {
      if (err.message === 'Usuário não encontrado.') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
        return;
      }
      next(err);
    }
  },
);

// PATCH /api/usuarios/:id/status — requer usuarios.alterar_status
usuariosRouter.patch(
  '/:id/status',
  requirePermission('usuarios.alterar_status'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await usuariosService.patchStatus(req.params.id, req.body);
      res.json(data);
    } catch (err: any) {
      if (err.message === 'Usuário não encontrado.') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
        return;
      }
      next(err);
    }
  },
);

// DELETE /api/usuarios/:id — requer usuarios.deletar
usuariosRouter.delete(
  '/:id',
  requirePermission('usuarios.deletar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usuariosService.remover(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      if (err.message === 'Usuário não encontrado.') {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
        return;
      }
      next(err);
    }
  },
);
