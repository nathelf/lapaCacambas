import { Router, type Request, type Response, type NextFunction } from 'express';
import * as relatoriosService from './relatorios.service';

export const relatoriosRouter = Router();

// GET /api/relatorios/operacional
relatoriosRouter.get('/operacional', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await relatoriosService.relatorioOperacional(req.query as any);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/relatorios/financeiro
relatoriosRouter.get('/financeiro', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await relatoriosService.relatorioFinanceiro(req.query as any);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/relatorios/boletos
relatoriosRouter.get('/boletos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await relatoriosService.relatorioBoletos(req.query as any);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/relatorios/inadimplencia
relatoriosRouter.get('/inadimplencia', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await relatoriosService.relatorioInadimplencia(req.query as any);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
