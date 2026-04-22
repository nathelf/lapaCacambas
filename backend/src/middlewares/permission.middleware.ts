import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

/**
 * Resolve permissão via função SQL has_permissao (3 camadas):
 *  1. Override explícito em usuario_permissoes (revoke vence grant)
 *  2. Permissão via role em role_permissoes
 *  3. Se não encontrado → negar
 */
async function resolvePermissao(userId: string, roles: string[], codigo: string): Promise<boolean> {
  console.log('[Permission] check:', codigo, '| user:', userId, '| roles:', roles);

  const { data, error } = await supabaseAdmin.rpc('has_permissao', {
    _user_id: userId,
    _permissao: codigo,
  });

  if (error) {
    console.error('[Permission] rpc error:', error.message, '| code:', error.code);
    // Fallback: admin sempre passa
    const ok = roles.includes('administrador');
    console.log('[Permission] fallback result:', ok);
    return ok;
  }

  console.log('[Permission] rpc result:', data, '| tipo:', typeof data);
  if (!data) {
    console.warn('[Permission] NEGADO:', codigo, '| user:', userId, '| roles:', roles);
  }
  return Boolean(data);
}

/**
 * Middleware de permissão granular.
 * Deve ser usado APÓS requireAuth, que já valida o token e popula req.user.
 *
 * Uso: router.get('/', requirePermission('usuarios.visualizar'), handler)
 */
export function requirePermission(codigo: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Autenticação necessária.' },
      });
    }

    try {
      const allowed = await resolvePermissao(req.user.id, req.user.roles, codigo);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Sem permissão: ${codigo}`,
            required: codigo,
          },
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Carrega todas as permissões do usuário (para uso no /auth/me e no frontend).
 * Retorna union de role_permissoes menos revogações em usuario_permissoes.
 */
export async function loadUserPermissoes(userId: string, roles: string[]): Promise<string[]> {
  if (roles.length === 0) return [];

  const [rolePermsResult, userOverridesResult] = await Promise.all([
    supabaseAdmin
      .from('role_permissoes')
      .select('permissao_codigo')
      .in('role', roles),
    supabaseAdmin
      .from('usuario_permissoes')
      .select('permissao_codigo, concedida')
      .eq('user_id', userId),
  ]);

  const roleSet = new Set(
    (rolePermsResult.data ?? []).map((r: any) => r.permissao_codigo as string),
  );

  for (const ov of userOverridesResult.data ?? []) {
    if (ov.concedida) roleSet.add(ov.permissao_codigo);
    else roleSet.delete(ov.permissao_codigo);
  }

  return Array.from(roleSet).sort();
}
