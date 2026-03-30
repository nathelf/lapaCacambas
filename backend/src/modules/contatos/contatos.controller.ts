import { Router, type Request, type Response, type NextFunction } from 'express';
import * as contatosService from './contatos.service';

export const contatosRouter = Router();

// GET /api/contatos?clienteId=1
contatosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clienteId = req.query.clienteId ? Number(req.query.clienteId) : undefined;
    if (!clienteId || isNaN(clienteId)) {
      res.status(400).json({ message: 'clienteId é obrigatório.' });
      return;
    }

    const data = await contatosService.listarPorCliente(clienteId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/contatos/:id
contatosRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await contatosService.buscarPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Contato não encontrado.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// POST /api/contatos
contatosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await contatosService.criar(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// PUT /api/contatos/:id
contatosRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const data = await contatosService.atualizar(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contatos/:id
contatosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    await contatosService.deletar(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
