import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin, supabaseAuth } from '../lib/supabase';

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  roles: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(allowedRoles: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return res.status(401).json({ message: 'Token ausente.' });

      const { data, error } = await supabaseAuth.auth.getUser(token);
      if (error || !data.user) return res.status(401).json({ message: 'Token inválido.' });

      const { data: roleRows, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);
      if (roleError) return res.status(500).json({ message: 'Falha ao carregar papéis do usuário.' });

      const roles = (roleRows ?? []).map((r: any) => String(r.role));
      if (allowedRoles.length > 0) {
        const allowed = roles.some((role) => allowedRoles.includes(role));
        if (!allowed) return res.status(403).json({ message: 'Sem permissão para esta rota.' });
      }

      req.user = { id: data.user.id, email: data.user.email ?? null, roles };
      next();
    } catch (err) {
      next(err);
    }
  };
}

