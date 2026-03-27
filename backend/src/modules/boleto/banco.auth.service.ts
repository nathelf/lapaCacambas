import type { BancoProviderAuthDTO } from './boleto.types';
import { BoletoRepository } from './boleto.repository';

interface BancoConfig {
  id: number;
  banco_nome: string;
  provedor_bancario: string;
  ambiente: string;
  api_base_url: string | null;
  api_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  token_atual: string | null;
  token_expira_em: string | null;
  empresa_id: string | null;
}

export class BancoAuthService {
  constructor(private readonly repo: BoletoRepository) {}

  isTokenExpired(config: BancoConfig): boolean {
    if (!config.token_expira_em) return true;
    return new Date(config.token_expira_em).getTime() <= Date.now() + 60000;
  }

  async authenticateWithProvider(config: BancoConfig): Promise<BancoProviderAuthDTO> {
    if (config.api_key) return { accessToken: config.api_key, expiresAt: null };
    if (!config.api_base_url || !config.client_id || !config.client_secret) {
      throw new Error('Configuração bancária sem credenciais mínimas.');
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
    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha autenticação bancária: HTTP ${res.status}`);
    const accessToken = String(payload.access_token || '');
    const expiresIn = Number(payload.expires_in || 3600);
    if (!accessToken) throw new Error('Provider bancário não retornou access_token.');
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return { accessToken, expiresAt };
  }

  async refreshTokenIfNeeded(config: BancoConfig): Promise<BancoProviderAuthDTO> {
    if (config.api_key) return { accessToken: config.api_key, expiresAt: null };
    if (config.token_atual && !this.isTokenExpired(config)) {
      return { accessToken: config.token_atual, expiresAt: config.token_expira_em };
    }
    const auth = await this.authenticateWithProvider(config);
    await this.repo.updateConfiguracaoToken(config.id, auth.accessToken, auth.expiresAt);
    return auth;
  }

  async getValidAccessToken(empresaId: string | null): Promise<{ auth: BancoProviderAuthDTO; config: BancoConfig }> {
    const config = await this.repo.getConfiguracaoAtiva(empresaId);
    if (!config) throw new Error('Configuração bancária ativa não encontrada.');
    const auth = await this.refreshTokenIfNeeded(config as BancoConfig);
    return { auth, config: config as BancoConfig };
  }
}

