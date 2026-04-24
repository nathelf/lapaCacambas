import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TenantTheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  welcome_msg?: string;
  hero_url?: string;
  headline?: string;
  subtitle?: string;
  login_tag?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_config: TenantTheme;
  enabled_features: string[];
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  /** true se o slug foi detectado mas não existe no banco */
  notFound: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

function detectSlug(): string {
  // Em desenvolvimento: variável de ambiente ou fallback para 'lapa'
  if (import.meta.env.VITE_TENANT_SLUG) return import.meta.env.VITE_TENANT_SLUG as string;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // "lapa.sistema.com.br" → "lapa"
  // "localhost" ou "sistema.com.br" → 'lapa' como default
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];

  return 'lapa';
}

/** Injeta as CSS variables do tema no :root do documento */
function applyTheme(theme: TenantTheme) {
  const root = document.documentElement;

  // Converte hex para HSL para compatibilidade com as variáveis do shadcn/ui
  if (theme.primary) root.style.setProperty('--tenant-primary', theme.primary);
  if (theme.secondary) root.style.setProperty('--tenant-secondary', theme.secondary);
  if (theme.accent) root.style.setProperty('--tenant-accent', theme.accent);

  // Remove o tema quando o componente for desmontado (cleanup)
  return () => {
    root.style.removeProperty('--tenant-primary');
    root.style.removeProperty('--tenant-secondary');
    root.style.removeProperty('--tenant-accent');
  };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const slug = detectSlug();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('tenants')
      .select('id, slug, name, logo_url, theme_config, enabled_features')
      .eq('slug', slug)
      .eq('active', true)
      .single()
      .then(({ data, error }: { data: Tenant | null; error: unknown }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          const t = data as Tenant;
          setTenant(t);
          cleanup = applyTheme(t.theme_config ?? {});
        }
        setLoading(false);
      });

    return () => cleanup?.();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, notFound }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
