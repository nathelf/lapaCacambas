import { Router, type Request, type Response, type NextFunction } from 'express';
import * as svc from './logistica.service';

export const logisticaRouter = Router();

// ─── Execuções ────────────────────────────────────────────────────────────────

// POST /api/logistica/execucoes
logisticaRouter.post('/execucoes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pedidoId, tipo, motoristaId, veiculoId } = req.body;
    if (!pedidoId || !tipo) {
      res.status(400).json({ message: 'pedidoId e tipo são obrigatórios.' });
      return;
    }
    const data = await svc.criarExecucao(Number(pedidoId), tipo, motoristaId, veiculoId);
    res.status(201).json(data);
  } catch (err: any) {
    if (err.message?.includes('não encontrado') || err.message?.includes('Já existe')) {
      res.status(422).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/logistica/execucoes?status=pendente&data=2026-04-08&semAtribuicao=true&dataInicio=2026-04-01&dataFim=2026-04-30&page=1
logisticaRouter.get('/execucoes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listarExecucoes({
      status: req.query.status as any,
      data: req.query.data as string | undefined,
      semAtribuicao: req.query.semAtribuicao === 'true',
      dataInicio: req.query.dataInicio as string | undefined,
      dataFim: req.query.dataFim as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/logistica/execucoes/:id
logisticaRouter.get('/execucoes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }
    const data = await svc.buscarExecucaoPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Execução não encontrada.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// PUT /api/logistica/execucoes/:id/atribuir
logisticaRouter.put('/execucoes/:id/atribuir', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const { motoristaId, veiculoId } = req.body;
    if (!motoristaId || !veiculoId) {
      res.status(400).json({ message: 'motoristaId e veiculoId são obrigatórios.' });
      return;
    }

    const data = await svc.atribuirExecucao(id, { motoristaId, veiculoId });
    res.json(data);
  } catch (err: any) {
    if (err.message.includes('bloqueado') || err.message.includes('manutenção')) {
      res.status(422).json({ message: err.message });
      return;
    }
    next(err);
  }
});

// PUT /api/logistica/execucoes/:id/status
logisticaRouter.put('/execucoes/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const { status, observacao, evidenciaUrl, latitude, longitude } = req.body;
    if (!status) { res.status(400).json({ message: 'status é obrigatório.' }); return; }

    const data = await svc.atualizarStatusExecucao(id, { status, observacao, evidenciaUrl, latitude, longitude });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/logistica/rotas?data=2026-04-08&motoristaId=1&status=planejada
logisticaRouter.get('/rotas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listarRotas({
      data: req.query.data as string | undefined,
      motoristaId: req.query.motoristaId ? Number(req.query.motoristaId) : undefined,
      status: req.query.status as any,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/logistica/rotas
logisticaRouter.post('/rotas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id ?? '';
    const { data: dataRota, motoristaId, veiculoId, observacao } = req.body;
    if (!dataRota || !motoristaId || !veiculoId) {
      res.status(400).json({ message: 'data, motoristaId e veiculoId são obrigatórios.' });
      return;
    }
    const data = await svc.criarRota({ data: dataRota, motoristaId, veiculoId, observacao }, userId);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/logistica/rotas/:id
logisticaRouter.get('/rotas/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }
    const data = await svc.buscarRotaPorId(id);
    res.json(data);
  } catch (err: any) {
    if (err.message === 'Rota não encontrada.') { res.status(404).json({ message: err.message }); return; }
    next(err);
  }
});

// PUT /api/logistica/rotas/:id/status
logisticaRouter.put('/rotas/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const { status } = req.body;
    if (!status) { res.status(400).json({ message: 'status é obrigatório.' }); return; }

    const data = await svc.atualizarStatusRota(id, status);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/logistica/rotas/:id/paradas
logisticaRouter.post('/rotas/:id/paradas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rotaId = Number(req.params.id);
    if (isNaN(rotaId)) { res.status(400).json({ message: 'ID inválido.' }); return; }

    const { pedidoId, ordem, endereco, tipo, observacao, latitude, longitude } = req.body;
    if (ordem === undefined) { res.status(400).json({ message: 'ordem é obrigatório.' }); return; }

    const data = await svc.adicionarParada(rotaId, { pedidoId, ordem, endereco, tipo, observacao, latitude, longitude });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/logistica/rotas/:id/paradas/:paradaId
logisticaRouter.delete('/rotas/:id/paradas/:paradaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rotaId = Number(req.params.id);
    const paradaId = Number(req.params.paradaId);
    if (isNaN(rotaId) || isNaN(paradaId)) { res.status(400).json({ message: 'IDs inválidos.' }); return; }

    await svc.removerParada(rotaId, paradaId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
