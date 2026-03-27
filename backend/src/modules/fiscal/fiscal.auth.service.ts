import type { FiscalProviderAuthDTO } from './fiscal.types';
import { FiscalRepository } from './fiscal.repository';

interface FiscalConfig {
  id: number;
  api_base_url: string | null;
  api_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  token_atual: string | null;
  token_expira_em: string | null;
}

export class FiscalAuthService {
  constructor(private readonly repo: FiscalRepository) {}

  isTokenExpired(tokenExpiraEm: string | null): boolean {
    if (!tokenExpiraEm) return true;
    return new Date(tokenExpiraEm).getTime() <= Date.now() + 60_000;
  }

  async authenticateWithProvider(config: FiscalConfig): Promise<FiscalProviderAuthDTO> {
    if (config.api_key) {
      return { accessToken: config.api_key, expiresAt: null };
    }

    if (!config.api_base_url || !config.client_id || !config.client_secret) {
      throw new Error('Configuração fiscal sem credenciais de autenticação.');
    }

    const res = await fetch(`${config.api_base_url}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.client_id,
        client_secret: config.client_secret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Falha na autenticação fiscal: HTTP ${res.status} - ${body.slice(0, 300)}`);
    }

    const payload = (await res.json()) as Record<string, unknown>;
    const accessToken = String(payload.access_token || '');
    const expiresIn = Number(payload.expires_in || 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    if (!accessToken) {
      throw new Error('Provider fiscal não retornou access_token.');
    }

    return { accessToken, expiresAt };
  }

  async refreshTokenIfNeeded(config: FiscalConfig): Promise<FiscalProviderAuthDTO> {
    if (config.api_key) return { accessToken: config.api_key, expiresAt: null };
    if (config.token_atual && !this.isTokenExpired(config.token_expira_em)) {
      return { accessToken: config.token_atual, expiresAt: config.token_expira_em };
    }
    const auth = await this.authenticateWithProvider(config);
    await this.repo.updateConfiguracaoFiscalToken(config.id, auth.accessToken, auth.expiresAt);
    return auth;
  }

  async getValidAccessToken(config: FiscalConfig): Promise<FiscalProviderAuthDTO> {
    return this.refreshTokenIfNeeded(config);
  }
}

