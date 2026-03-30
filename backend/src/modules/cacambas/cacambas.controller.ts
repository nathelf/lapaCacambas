import { Router, type Request, type Response, type NextFunction } from 'express';
import * as cacambasService from './cacambas.service';

export const cacambasRouter = Router();

// ─── Tipos/modelos ────────────────────────────────────────────────────────────

// GET /api/cacambas
cacambasRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cacambasService.listarCacambas();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/cacambas/:id
cacambasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await cacambasService.buscarCacambaPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Caçamba não encontrada.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/cacambas
cacambasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cacambasService.criarCacamba(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cacambas/:id
cacambasRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await cacambasService.atualizarCacamba(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── Unidades físicas ─────────────────────────────────────────────────────────

// GET /api/cacambas/unidades?status=disponivel&cacambaId=1
cacambasRouter.get('/unidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cacambasService.listarUnidades({
      status: req.query.status as any,
      cacambaId: req.query.cacambaId ? Number(req.query.cacambaId) : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/cacambas/unidades
cacambasRouter.post('/unidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cacambasService.criarUnidade(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cacambas/unidades/:id
cacambasRouter.put('/unidades/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await cacambasService.atualizarUnidade(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
