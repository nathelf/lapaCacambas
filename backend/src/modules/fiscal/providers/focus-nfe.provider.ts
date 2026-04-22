/**
 * FocusNfeProvider — Integração com Focus NFe API REST para NFS-e.
 *
 * Autenticação: HTTP Basic — token como usuário, senha vazia.
 *   Authorization: Basic base64(token:)
 *
 * Docs: https://focusnfe.com.br/doc/#nfse
 *
 * Endpoints:
 *   POST   {baseUrl}/v2/nfse?ref={ref}       — emissão
 *   GET    {baseUrl}/v2/nfse/{ref}            — consulta status
 *   DELETE {baseUrl}/v2/nfse/{ref}            — cancelamento
 *   GET    {baseUrl}/v2/nfse/{ref}/pdf        — PDF
 */

import type {
  IFiscalProvider,
  FiscalProviderContext,
  EmitirProviderPayload,
  EmitirProviderResult,
  CancelarProviderPayload,
} from './fiscal-provider.interface';
import { FiscalIntegrationError } from '../fiscal.errors';
import { FISCAL_LIMITS, FOCUS_BASE_URLS } from '../fiscal.constants';

export class FocusNfeProvider implements IFiscalProvider {

  private baseUrl(ctx: FiscalProviderContext): string {
    if (ctx.apiBaseUrl) return ctx.apiBaseUrl;
    return ctx.ambiente === 'producao'
      ? FOCUS_BASE_URLS.producao
      : FOCUS_BASE_URLS.homologacao;
  }

  /** Focus NFe usa HTTP Basic: token como usuário, senha vazia */
  private authHeader(ctx: FiscalProviderContext): string {
    const encoded = Buffer.from(`${ctx.accessToken}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FISCAL_LIMITS.TIMEOUT_PROVIDER_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private buildFocusPayload(payload: EmitirProviderPayload): Record<string, unknown> {
    const { cliente, itens, prestador, config, reformaTributaria } = payload;
    const aliquota = config?.aliquotaIss ?? payload.aliquotaIss ?? 2.0;

    // ── Tomador ────────────────────────────────────────────────────────────────
    const tomador: Record<string, unknown> = {
      razao_social: cliente.nome,
      email: cliente.email || undefined,
      telefone: cliente.telefone?.replace(/\D/g, '') || undefined,
    };

    if (cliente.idEstrangeiro) {
      tomador.id_estrangeiro = cliente.idEstrangeiro;
      tomador.pais = cliente.pais || 'Brasil';
    } else if (cliente.documento) {
      const doc = cliente.documento.replace(/\D/g, '');
      if (doc.length === 14) tomador.cnpj = doc;
      else if (doc.length === 11) tomador.cpf = doc;
    }

    if (cliente.cep || cliente.endereco) {
      tomador.endereco = {
        logradouro:       cliente.endereco   || '',
        numero:           cliente.numero     || 's/n',
        bairro:           cliente.bairro     || '',
        codigo_municipio: cliente.municipio  || config?.codigoMunicipio || prestador?.codigoMunicipio || '',
        uf:               cliente.uf         || '',
        cep:              (cliente.cep || '').replace(/\D/g, ''),
      };
    }

    // ── Itens ──────────────────────────────────────────────────────────────────
    const items = itens.map((item) => {
      const itemObj: Record<string, unknown> = {
        discriminacao:                  item.descricao,
        codigo_tributacao_municipio:    item.codigoServicoMunicipal || config?.itemListaServico || '7.09',
        valor_unitario:                 item.valorUnitario,
        quantidade:                     item.quantidade,
        iss_retido:                     false,
        aliquota_iss:                   aliquota,
        base_calculo:                   item.valorUnitario * item.quantidade,
      };
      return itemObj;
    });

    // ── Prestador ──────────────────────────────────────────────────────────────
    const prestadorPayload: Record<string, unknown> = {
      codigo_municipio:   prestador?.codigoMunicipio  || config?.codigoMunicipio || '',
      inscricao_municipal: prestador?.inscricaoMunicipal || '',
    };
    if (prestador?.cnpj) {
      prestadorPayload.cnpj = prestador.cnpj.replace(/\D/g, '');
    }

    const focusPayload: Record<string, unknown> = {
      data_emissao:         new Date().toISOString(),
      natureza_operacao:    config?.naturezaOperacao ?? 1,
      regime_tributacao:    config?.regimeTributario ?? 1,
      optante_simples_nacional: config?.regimeTributario === 6 ? 1 : 2,
      prestador:            prestadorPayload,
      tomador,
      items,
    };

    // ── Reforma Tributária 2026+ ───────────────────────────────────────────────
    if (reformaTributaria?.cbsHabilitado || reformaTributaria?.ibsHabilitado) {
      const rt: Record<string, unknown> = {};
      if (reformaTributaria.cbsHabilitado && reformaTributaria.cbsValor !== undefined) {
        rt.cbs_valor    = reformaTributaria.cbsValor;
        rt.cbs_aliquota = reformaTributaria.cbsAliquota;
      }
      if (reformaTributaria.ibsHabilitado) {
        rt.ibs_municipio_valor = reformaTributaria.ibsMunValor;
        rt.ibs_uf_valor        = reformaTributaria.ibsUfValor;
        rt.ibs_cbs_base_calculo         = reformaTributaria.ibsCbsBaseCalculo;
        rt.ibs_cbs_situacao_tributaria  = reformaTributaria.ibsCbsSituacaoTributaria;
      }
      focusPayload.reforma_tributaria = rt;
    }

    return focusPayload;
  }

  async emitir(ctx: FiscalProviderContext, payload: EmitirProviderPayload): Promise<EmitirProviderResult> {
    const baseUrl = this.baseUrl(ctx);
    const ref     = payload.idempotencyKey;
    const body    = this.buildFocusPayload(payload);

    const res = await this.fetchWithTimeout(`${baseUrl}/v2/nfse?ref=${encodeURIComponent(ref)}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   this.authHeader(ctx),
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok && res.status !== 201 && res.status !== 202) {
      const erros = (json.erros as any[])?.map((e: any) => e.mensagem).join('; ') || JSON.stringify(json);
      throw new FiscalIntegrationError(`Focus NFe: emissão retornou HTTP ${res.status} — ${erros}`, {
        httpStatus: res.status, body: json,
      });
    }

    const nfse = (json.nfse || json) as Record<string, unknown>;
    const status = this.mapFocusStatus(String(json.status || ''));

    return {
      externalId:       ref,
      numeroNota:       String(nfse.numero_nfse || nfse.numero || ''),
      serie:            String(nfse.serie || '1'),
      status,
      ambiente:         ctx.ambiente,
      chaveAcesso:      nfse.codigo_verificacao ? String(nfse.codigo_verificacao) : undefined,
      protocolo:        nfse.numero_protocolo   ? String(nfse.numero_protocolo)   : undefined,
      xmlUrl:           nfse.link_nfse_xml      ? String(nfse.link_nfse_xml)      : undefined,
      pdfUrl:           nfse.link_nfse_pdf      ? String(nfse.link_nfse_pdf)      : undefined,
      providerRequest:  { ...body, authorization: '[MASKED]' },
      providerResponse: json,
      mensagem:         json.mensagem ? String(json.mensagem) : undefined,
    };
  }

  async consultarStatus(ctx: FiscalProviderContext, externalId: string): Promise<Record<string, unknown>> {
    const baseUrl = this.baseUrl(ctx);
    const res = await this.fetchWithTimeout(`${baseUrl}/v2/nfse/${encodeURIComponent(externalId)}`, {
      headers: { Authorization: this.authHeader(ctx) },
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new FiscalIntegrationError(`Focus NFe: consulta retornou HTTP ${res.status}`, { json });
    return json;
  }

  async cancelar(ctx: FiscalProviderContext, input: CancelarProviderPayload): Promise<Record<string, unknown>> {
    const baseUrl = this.baseUrl(ctx);

    // Focus NFe cancela via DELETE com body JSON
    const res = await this.fetchWithTimeout(`${baseUrl}/v2/nfse/${encodeURIComponent(input.externalId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  this.authHeader(ctx),
      },
      body: JSON.stringify({ justificativa: input.reason }),
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    // Focus retorna 200 ou 204 em cancelamento bem-sucedido
    if (!res.ok && res.status !== 204) {
      const mensagem = String((json as any)?.mensagem || `HTTP ${res.status}`);
      throw new FiscalIntegrationError(`Focus NFe: cancelamento falhou — ${mensagem}`, {
        httpStatus: res.status, body: json,
      });
    }

    return json;
  }

  async baixarXml(ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    const baseUrl = this.baseUrl(ctx);
    const res = await this.fetchWithTimeout(`${baseUrl}/v2/nfse/${encodeURIComponent(externalId)}/xml`, {
      headers: { Authorization: this.authHeader(ctx) },
    });
    if (!res.ok) return { xmlUrl: null };
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { xmlUrl: (json.link_nfse_xml || json.xml_url) as string | null ?? null };
  }

  async baixarPdf(ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    const baseUrl = this.baseUrl(ctx);
    const res = await this.fetchWithTimeout(`${baseUrl}/v2/nfse/${encodeURIComponent(externalId)}/pdf`, {
      headers: { Authorization: this.authHeader(ctx) },
    });
    if (!res.ok) return { pdfUrl: null };
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { pdfUrl: (json.link_nfse_pdf || json.pdf_url) as string | null ?? null };
  }

  private mapFocusStatus(focusStatus: string): 'emitida' | 'pendente' | 'erro' {
    const s = focusStatus.toLowerCase();
    if (['autorizado', 'emitido'].includes(s))                    return 'emitida';
    if (['processando_autorizacao', 'recebido'].includes(s))       return 'pendente';
    if (['erro_autorizacao', 'negado', 'cancelado'].includes(s))   return 'erro';
    return 'pendente';
  }
}
