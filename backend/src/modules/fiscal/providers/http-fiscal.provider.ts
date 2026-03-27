import { BaseFiscalProvider, type CancelProviderInput, type EmitProviderInput, type FiscalProviderContext } from './base-fiscal.provider';
import type { FiscalProviderEmitDTO } from '../fiscal.types';

export class HttpFiscalProvider extends BaseFiscalProvider {
  private getAuthHeaders(ctx: FiscalProviderContext) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.accessToken}`,
    };
  }

  async emitir(ctx: FiscalProviderContext, input: EmitProviderInput): Promise<FiscalProviderEmitDTO> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url não definida para provider fiscal.');

    const res = await fetch(`${ctx.apiBaseUrl}/nfe/emitir`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(ctx),
        'X-Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify(input.payload),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha provider fiscal emitir: HTTP ${res.status}`);

    return {
      externalId: String(json.external_id || json.id || input.idempotencyKey),
      numeroNota: String(json.numero_nota || json.numero || ''),
      serie: json.serie ? String(json.serie) : '1',
      status: (json.status as 'emitida' | 'pendente' | 'erro') || 'pendente',
      ambiente: String(json.ambiente || ctx.ambiente),
      chaveAcesso: json.chave_acesso ? String(json.chave_acesso) : undefined,
      protocolo: json.protocolo ? String(json.protocolo) : undefined,
      xmlUrl: json.xml_url ? String(json.xml_url) : undefined,
      pdfUrl: json.pdf_url ? String(json.pdf_url) : undefined,
      providerRequest: input.payload,
      providerResponse: json,
      mensagem: json.mensagem ? String(json.mensagem) : undefined,
    };
  }

  async consultarStatus(ctx: FiscalProviderContext, externalId: string): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url não definida para provider fiscal.');
    const res = await fetch(`${ctx.apiBaseUrl}/nfe/${externalId}/status`, {
      headers: this.getAuthHeaders(ctx),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha provider fiscal status: HTTP ${res.status}`);
    return json;
  }

  async cancelar(ctx: FiscalProviderContext, input: CancelProviderInput): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url não definida para provider fiscal.');
    const res = await fetch(`${ctx.apiBaseUrl}/nfe/${input.externalId}/cancelar`, {
      method: 'POST',
      headers: this.getAuthHeaders(ctx),
      body: JSON.stringify({ reason: input.reason }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha provider fiscal cancelamento: HTTP ${res.status}`);
    return json;
  }

  async baixarXml(ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url não definida para provider fiscal.');
    const res = await fetch(`${ctx.apiBaseUrl}/nfe/${externalId}/xml`, { headers: this.getAuthHeaders(ctx) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha provider fiscal xml: HTTP ${res.status}`);
    return { xmlUrl: (json.xml_url as string) || null };
  }

  async baixarPdf(ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url não definida para provider fiscal.');
    const res = await fetch(`${ctx.apiBaseUrl}/nfe/${externalId}/pdf`, { headers: this.getAuthHeaders(ctx) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha provider fiscal pdf: HTTP ${res.status}`);
    return { pdfUrl: (json.pdf_url as string) || null };
  }
}

