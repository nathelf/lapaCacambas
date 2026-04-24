import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin, supabaseAuth } from '../lib/supabase';

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  roles: string[];
  tenant_id: string;
  /** Permissões granulares — carregadas sob demanda */
  permissoes?: string[];
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

      const [{ data: roleRows, error: roleError }, { data: profileRow, error: profileError }] =
        await Promise.all([
          supabaseAdmin.from('user_roles').select('role').eq('user_id', data.user.id),
          supabaseAdmin.from('profiles').select('tenant_id').eq('id', data.user.id).single(),
        ]);

      if (roleError) return res.status(500).json({ message: 'Falha ao carregar papéis do usuário.' });
      if (profileError || !profileRow?.tenant_id) {
        return res.status(500).json({ message: 'Perfil ou tenant não encontrado.' });
      }

      const roles = (roleRows ?? []).map((r: any) => String(r.role));
      if (allowedRoles.length > 0) {
        const allowed = roles.some((role) => allowedRoles.includes(role));
        if (!allowed) return res.status(403).json({ message: 'Sem permissão para esta rota.' });
      }

      req.user = { id: data.user.id, email: data.user.email ?? null, roles, tenant_id: profileRow.tenant_id };
      next();
    } catch (err) {
      next(err);
    }
  };
}

