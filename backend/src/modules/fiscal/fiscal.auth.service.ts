import type { FiscalProviderAuthDTO } from './fiscal.types';
import { FiscalRepository } from './fiscal.repository';
import { FiscalProvider } from './fiscal.constants';
import { FiscalAuthenticationError } from './fiscal.errors';

export interface FiscalConfig {
  id: number;
  provedor_fiscal?: string | null;
  api_base_url?: string | null;
  api_key?: string | null;
  client_id?: string | null;
  client_secret?: string | null;
  token_atual?: string | null;
  token_expira_em?: string | null;
  /** Focus NFe — token direto (Basic auth) */
  focus_token?: string | null;
  /** AtendeNet — credenciais de login */
  login?: string | null;
  senha?: string | null;
}

export class FiscalAuthService {
  constructor(private readonly repo: FiscalRepository) {}

  isTokenExpired(tokenExpiraEm: string | null | undefined): boolean {
    if (!tokenExpiraEm) return true;
    return new Date(tokenExpiraEm).getTime() <= Date.now() + 60_000;
  }

  /**
   * Ponto de entrada único. Delega ao método correto conforme o provider.
   */
  async getValidAccessToken(config: FiscalConfig): Promise<FiscalProviderAuthDTO> {
    const provider = config.provedor_fiscal?.toLowerCase() ?? '';

    // Focus NFe: token direto — o provider encapsula como Basic auth
    if (provider === FiscalProvider.FOCUS) {
      if (!config.focus_token && !config.api_key) {
        throw new FiscalAuthenticationError('Focus NFe: focus_token não configurado.');
      }
      return { accessToken: (config.focus_token || config.api_key)!, expiresAt: null };
    }

    // AtendeNet: login + senha → session token com cache
    if (provider === FiscalProvider.ATENDENET) {
      return this.getAtendeNetToken(config);
    }

    // API Key genérica (mock, http)
    if (config.api_key) return { accessToken: config.api_key, expiresAt: null };

    // OAuth client_credentials (fallback genérico)
    return this.refreshOAuthTokenIfNeeded(config);
  }

  // ── AtendeNet: login/senha → session token ────────────────────────────────

  private async getAtendeNetToken(config: FiscalConfig): Promise<FiscalProviderAuthDTO> {
    // Usa token cacheado se ainda válido
    if (config.token_atual && !this.isTokenExpired(config.token_expira_em)) {
      return { accessToken: config.token_atual, expiresAt: config.token_expira_em ?? null };
    }

    if (!config.api_base_url || !config.login || !config.senha) {
      throw new FiscalAuthenticationError(
        'AtendeNet: api_base_url, login e senha são obrigatórios.',
      );
    }

    const res = await fetch(`${config.api_base_url}/api/v1/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ usuario: config.login, senha: config.senha }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new FiscalAuthenticationError(
        `AtendeNet: autenticação falhou — HTTP ${res.status}: ${body.slice(0, 200)}`,
      );
    }

    const payload   = (await res.json()) as Record<string, unknown>;
    const token     = String(payload.token || payload.access_token || '');
    if (!token) throw new FiscalAuthenticationError('AtendeNet: resposta de login sem token.');

    const expiresIn = Number(payload.expires_in || payload.expira_em || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await this.repo.updateConfiguracaoFiscalToken(config.id, token, expiresAt);
    return { accessToken: token, expiresAt };
  }

  // ── OAuth client_credentials (provider genérico) ──────────────────────────

  private async refreshOAuthTokenIfNeeded(config: FiscalConfig): Promise<FiscalProviderAuthDTO> {
    if (config.token_atual && !this.isTokenExpired(config.token_expira_em)) {
      return { accessToken: config.token_atual, expiresAt: config.token_expira_em ?? null };
    }

    if (!config.api_base_url || !config.client_id || !config.client_secret) {
      throw new FiscalAuthenticationError('Configuração fiscal sem credenciais OAuth.');
    }

    const res = await fetch(`${config.api_base_url}/oauth/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        grant_type:    'client_credentials',
        client_id:     config.client_id,
        client_secret: config.client_secret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new FiscalAuthenticationError(
        `OAuth fiscal falhou — HTTP ${res.status}: ${body.slice(0, 300)}`,
      );
    }

    const payload     = (await res.json()) as Record<string, unknown>;
    const accessToken = String(payload.access_token || '');
    if (!accessToken) throw new FiscalAuthenticationError('Provider OAuth não retornou access_token.');

    const expiresIn = Number(payload.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await this.repo.updateConfiguracaoFiscalToken(config.id, accessToken, expiresAt);
    return { accessToken, expiresAt };
  }
}

