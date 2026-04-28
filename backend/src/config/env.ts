import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.BACKEND_PORT || 3333),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  bancoWebhookSecret: process.env.BANCO_WEBHOOK_SECRET || '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '',

  // ── Fiscal (opcionais — sobrescrevem config do banco em dev/CI) ────────────
  fiscal: {
    /** Sobrescreve o ambiente fiscal de qualquer config do banco (ex: forçar homologacao em staging) */
    ambienteOverride: process.env.FISCAL_AMBIENTE_OVERRIDE || null,
    /** Força o provider 'mock' independente da config — útil em testes automatizados */
    providerOverride: process.env.FISCAL_PROVIDER_OVERRIDE || null,
    /** Focus NFe: token direto (Basic auth). Sobrescreve focus_token do banco. */
    focusToken: process.env.FISCAL_FOCUS_TOKEN || null,
    /** AtendeNet: credenciais de sandbox. Sobrescrevem valores do banco. */
    atendeNetBaseUrl: process.env.FISCAL_ATENDENET_BASE_URL || null,
    atendeNetLogin: process.env.FISCAL_ATENDENET_LOGIN || null,
    atendeNetSenha: process.env.FISCAL_ATENDENET_SENHA || null,
  },
};

