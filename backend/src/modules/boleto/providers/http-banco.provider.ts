import { BaseBancoProvider, type BancoProviderContext } from './base-banco.provider';
import type { BancoProviderEmitDTO } from '../boleto.types';

export class HttpBancoProvider extends BaseBancoProvider {
  private headers(ctx: BancoProviderContext) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.accessToken}`,
    };
  }

  async emitirBoleto(ctx: BancoProviderContext, payload: Record<string, unknown>, idempotencyKey: string): Promise<BancoProviderEmitDTO> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url bancária não configurada.');
    const res = await fetch(`${ctx.apiBaseUrl}/boletos`, {
      method: 'POST',
      headers: { ...this.headers(ctx), 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha na emissão bancária: HTTP ${res.status}`);
    return {
      externalId: String(json.external_id || json.id || idempotencyKey),
      nossoNumero: String(json.nosso_numero || ''),
      linhaDigitavel: String(json.linha_digitavel || ''),
      codigoBarras: String(json.codigo_barras || ''),
      pdfUrl: (json.pdf_url as string) || null,
      status: (json.status as 'emitido' | 'pendente' | 'erro') || 'emitido',
      providerRequest: payload,
      providerResponse: json,
      mensagem: (json.mensagem as string) || undefined,
    };
  }

  async consultarBoleto(ctx: BancoProviderContext, externalId: string): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url bancária não configurada.');
    const res = await fetch(`${ctx.apiBaseUrl}/boletos/${externalId}`, { headers: this.headers(ctx) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha consulta bancária: HTTP ${res.status}`);
    return json;
  }

  async cancelarBoleto(ctx: BancoProviderContext, externalId: string, reason: string): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url bancária não configurada.');
    const res = await fetch(`${ctx.apiBaseUrl}/boletos/${externalId}/cancelar`, {
      method: 'POST',
      headers: this.headers(ctx),
      body: JSON.stringify({ reason }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha cancelamento bancário: HTTP ${res.status}`);
    return json;
  }

  async registrarPagamento(ctx: BancoProviderContext, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url bancária não configurada.');
    const res = await fetch(`${ctx.apiBaseUrl}/boletos/webhook/ack`, {
      method: 'POST',
      headers: this.headers(ctx),
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha registro pagamento no provider: HTTP ${res.status}`);
    return json;
  }

  async baixarPdf(ctx: BancoProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    if (!ctx.apiBaseUrl) throw new Error('api_base_url bancária não configurada.');
    const res = await fetch(`${ctx.apiBaseUrl}/boletos/${externalId}/pdf`, { headers: this.headers(ctx) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Falha download PDF bancário: HTTP ${res.status}`);
    return { pdfUrl: (json.pdf_url as string) || null };
  }
}

