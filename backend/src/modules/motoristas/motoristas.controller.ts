import { Router, type Request, type Response, type NextFunction } from 'express';
import * as motoService from './motoristas.service';

export const motoristasRouter = Router();

function tenantIdOr400(req: Request, res: Response): string | null {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant não encontrado no contexto do usuário.' });
    return null;
  }
  return tenantId;
}

// GET /api/motoristas/vinculo/candidatos-usuarios — perfis do tenant para vínculo com motoristas.user_id
motoristasRouter.get('/vinculo/candidatos-usuarios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const data = await motoService.listarCandidatosVinculo(tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/motoristas/meta/usuarios-sem-ficha — antes de /:id
motoristasRouter.get('/meta/usuarios-sem-ficha', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const data = await motoService.listarUsuariosMotoristaSemFicha(tenantId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/motoristas/meta/criar-ficha/:userId
motoristasRouter.post('/meta/criar-ficha/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const userId = req.params.userId;
    if (!userId || userId.length < 10) {
      res.status(400).json({ message: 'Identificador de usuário inválido.' });
      return;
    }
    const data = await motoService.criarFichaMinimaPorUsuario(userId, tenantId);
    res.status(201).json(data);
  } catch (err: any) {
    const msg = err?.message as string | undefined;
    if (
      msg === 'Usuário não encontrado neste tenant.' ||
      msg === 'Este usuário não tem o papel motorista.' ||
      msg === 'Este usuário já possui ficha de motorista.'
    ) {
      res.status(422).json({ message: msg });
      return;
    }
    if (msg?.includes('já está vinculado')) {
      res.status(422).json({ message: msg });
      return;
    }
    next(err);
  }
});

// GET /api/motoristas?status=ativo&busca=joao
motoristasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const data = await motoService.listar(
      {
        status: req.query.status as any,
        busca: req.query.busca as string | undefined,
      },
      tenantId,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/motoristas/:id
motoristasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await motoService.buscarPorId(id, tenantId);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Motorista não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/motoristas
motoristasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const data = await motoService.criar(req.body, tenantId);
    res.status(201).json(data);
  } catch (err: any) {
    if (err.message?.includes('já está vinculado')) {
      res.status(422).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// PUT /api/motoristas/:id
motoristasRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = tenantIdOr400(req, res);
    if (!tenantId) return;
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await motoService.atualizar(id, req.body, tenantId);
    res.json(data);
  } catch (err: any) {
    if (err.message?.includes('já está vinculado')) {
      res.status(422).json({ message: err.message });
      return;
    }
    next(err);
  }
});
