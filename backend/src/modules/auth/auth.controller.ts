import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import * as authService from './auth.service';

export const authRouter = Router();

// POST /auth/login
// Rota pública — não precisa de token
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err: any) {
    // Não vazar detalhes do erro de auth para o cliente
    res.status(401).json({ message: err.message ?? 'Falha na autenticação.' });
  }
});

// POST /auth/refresh
// Rota pública — recebe o refresh_token e devolve novos tokens
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.refresh(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ message: err.message ?? 'Refresh token inválido.' });
  }
});

// POST /auth/logout
// Rota protegida — precisa estar logado para deslogar
authRouter.post('/logout', requireAuth(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization!.slice(7); // remove "Bearer "
    await authService.logout(token);
    res.json({ message: 'Sessão encerrada.' });
  } catch (err: any) {
    next(err);
  }
});

// GET /auth/me
// Devolve os dados do usuário logado — útil para o frontend saber os roles e montar o menu
authRouter.get('/me', requireAuth(), (req: Request, res: Response) => {
  res.json({ user: req.user });
});
