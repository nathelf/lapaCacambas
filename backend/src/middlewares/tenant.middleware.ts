import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_config: Record<string, string>;
  enabled_features: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

/** Extrai o slug do tenant a partir do hostname ou do header X-Tenant-Slug (dev). */
function extractSlug(req: Request): string | null {
  // Header explícito — útil em ambiente local/testes
  const headerSlug = req.headers['x-tenant-slug'];
  if (typeof headerSlug === 'string' && headerSlug.trim()) return headerSlug.trim();

  // Subdomínio: "lapa.sistema.com.br" → "lapa"
  const host = (req.headers['x-forwarded-host'] || req.hostname || '').toString();
  const parts = host.split('.');
  // Ignora "www" e hosts simples como "localhost"
  if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    return parts[0];
  }
  return null;
}

const tenantCache = new Map<string, { tenant: Tenant; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function loadTenant(slug: string): Promise<Tenant | null> {
  const cached = tenantCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.tenant;

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, name, logo_url, theme_config, enabled_features')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error || !data) return null;

  const tenant = data as Tenant;
  tenantCache.set(slug, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
  return tenant;
}

/** Middleware que resolve o tenant e anexa em req.tenant.
 *  Retorna 404 se o slug não existir ou o tenant estiver inativo. */
export function resolveTenant() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const slug = extractSlug(req);

    if (!slug) {
      // Sem slug → não aplica isolamento (útil para health check e rotas globais)
      return next();
    }

    try {
      const tenant = await loadTenant(slug);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' não encontrado.` },
        });
      }
      req.tenant = tenant;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Verifica se o tenant tem uma feature habilitada. */
export function tenantHasFeature(tenant: Tenant, feature: string): boolean {
  return tenant.enabled_features.includes(feature);
}

/** Middleware de guarda para rotas que exigem uma feature específica. */
export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) return next(); // sem tenant resolvido, deixa passar (outra camada decide)
    if (!tenantHasFeature(req.tenant, feature)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FEATURE_DISABLED', message: `Módulo '${feature}' não habilitado para este tenant.` },
      });
    }
    next();
  };
}
