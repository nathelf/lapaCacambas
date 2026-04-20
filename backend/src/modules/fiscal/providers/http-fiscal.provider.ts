import type {
  IFiscalProvider,
  FiscalProviderContext,
  EmitirProviderPayload,
  EmitirProviderResult,
  CancelarProviderPayload,
} from './fiscal-provider.interface';
import { FiscalIntegrationError } from '../fiscal.errors';
import { FISCAL_LIMITS } from '../fiscal.constants';

/**
 * Provider HTTP genérico para integração real com município.
 *
 * Endpoints esperados (padrão comum nos gateways NFS-e):
 *   POST   {apiBaseUrl}/nfse/emitir
 *   GET    {apiBaseUrl}/nfse/{externalId}/status
 *   POST   {apiBaseUrl}/nfse/{externalId}/cancelar
 *   GET    {apiBaseUrl}/nfse/{externalId}/xml
 *   GET    {apiBaseUrl}/nfse/{externalId}/pdf
 *
 * Para integração com Cascavel/PR: substituir URLs e mapeamento de campos
 * conforme documentação do gateway municipal (Tecnos, Betha, NFE.io, etc.)
 */
export class HttpFiscalProvider implements IFiscalProvider {

  private authHeaders(ctx: FiscalProviderContext): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.accessToken}`,
    };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = FISCAL_LIMITS.TIMEOUT_PROVIDER_MS,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async emitir(ctx: FiscalProviderContext, payload: EmitirProviderPayload): Promise<EmitirProviderResult> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('api_base_url não definida para provider fiscal.');

    const res = await this.fetchWithTimeout(`${ctx.apiBaseUrl}/nfse/emitir`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(ctx),
        'X-Idempotency-Key': payload.idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      throw new FiscalIntegrationError(
        `Provider fiscal retornou HTTP ${res.status} na emissão.`,
        { httpStatus: res.status, body: json },
      );
    }

    return {
      externalId: String(json.external_id || json.id || payload.idempotencyKey),
      numeroNota: String(json.numero_nota || json.numero || ''),
      serie: json.serie ? String(json.serie) : '1',
      status: (json.status as 'emitida' | 'pendente' | 'erro') || 'pendente',
      ambiente: String(json.ambiente || ctx.ambiente),
      chaveAcesso: json.chave_acesso ? String(json.chave_acesso) : undefined,
      protocolo: json.protocolo ? String(json.protocolo) : undefined,
      xmlUrl: json.xml_url ? String(json.xml_url) : undefined,
      pdfUrl: json.pdf_url ? String(json.pdf_url) : undefined,
      providerRequest: { ...payload, accessToken: '[MASKED]' },
      providerResponse: json,
      mensagem: json.mensagem ? String(json.mensagem) : undefined,
    };
  }

  async consultarStatus(ctx: FiscalProviderContext, externalId: string): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('api_base_url não definida para provider fiscal.');
    const res = await this.fetchWithTimeout(
      `${ctx.apiBaseUrl}/nfse/${externalId}/status`,
      { headers: this.authHeaders(ctx) },
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new FiscalIntegrationError(`Provider fiscal status: HTTP ${res.status}`, { json });
    return json;
  }

  async cancelar(ctx: FiscalProviderContext, input: CancelarProviderPayload): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('api_base_url não definida para provider fiscal.');
    const res = await this.fetchWithTimeout(
      `${ctx.apiBaseUrl}/nfse/${input.externalId}/cancelar`,
      {
        method: 'POST',
        headers: this.authHeaders(ctx),
        body: JSON.stringify({ reason: input.reason }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new FiscalIntegrationError(`Provider fiscal cancelamento: HTTP ${res.status}`, { json });
    return json;
  }

  async baixarXml(ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('api_base_url não definida para provider fiscal.');
    const res = await this.fetchWithTimeout(
      `${ctx.apiBaseUrl}/nfse/${externalId}/xml`,
      { headers: this.authHeaders(ctx) },
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new FiscalIntegrationError(`Provider fiscal xml: HTTP ${res.status}`, { json });
    return { xmlUrl: (json.xml_url as string) || null };
  }

  async baixarPdf(ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('api_base_url não definida para provider fiscal.');
    const res = await this.fetchWithTimeout(
      `${ctx.apiBaseUrl}/nfse/${externalId}/pdf`,
      { headers: this.authHeaders(ctx) },
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new FiscalIntegrationError(`Provider fiscal pdf: HTTP ${res.status}`, { json });
    return { pdfUrl: (json.pdf_url as string) || null };
  }
}
