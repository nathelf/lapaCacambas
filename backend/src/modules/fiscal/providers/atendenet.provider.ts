/**
 * AtendeNetProvider — Integração IPM Atende.Net (Lapa).
 *
 * Contrato real conforme NTE-35/2021 + NTE-122/2025:
 * - Endpoint único REST: ...?pg=rest&service=WNERestServiceNFSe
 * - Envio de XML via multipart/form-data (campo "arquivo")
 * - Autenticação HTTP Basic (login/senha do portal), com cookie de sessão PHPSESSID opcional
 */

import type {
  IFiscalProvider,
  FiscalProviderContext,
  EmitirProviderPayload,
  EmitirProviderResult,
  CancelarProviderPayload,
} from './fiscal-provider.interface';
import { FiscalIntegrationError, FiscalAuthenticationError } from '../fiscal.errors';
import { FISCAL_LIMITS } from '../fiscal.constants';
import { FiscalLogger } from '../fiscal.logger';
import { withRetry } from '../fiscal.retry';
import { normalizarCodigoMunicipioIpm } from '../ipm-codigo-municipio';
import { decodeTextResponseBytes } from '../../../lib/http-text-encoding';

export class AtendeNetProvider implements IFiscalProvider {
  private sessionCookie: string | null = null;

  private resolveBaseUrl(ctx: FiscalProviderContext): string {
    if (ctx.apiBaseUrl) return ctx.apiBaseUrl;
    // Fallback explícito para Lapa quando api_base_url não for informado.
    return ctx.ambiente === 'producao'
      ? 'https://lapa.atende.net/?pg=rest&service=WNERestServiceNFSe'
      : 'https://ws-lapa.atende.net:7443/?pg=rest&service=WNERestServiceNFSe';
  }

  private buildFallbackBaseUrl(primaryUrl: string): string | null {
    // Ex.: https://ws-cascavel.atende.net:7443/?pg=rest&service=WNERestServiceNFSe
    //  ->  https://cascavel.atende.net/?pg=rest&service=WNERestServiceNFSe
    if (!primaryUrl.includes('://ws-') || !primaryUrl.includes(':7443')) return null;
    return primaryUrl.replace('://ws-', '://').replace(':7443', '');
  }

  private authHeaders(ctx: FiscalProviderContext): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Basic ${ctx.accessToken}`,
    };
    if (this.sessionCookie) headers.Cookie = `PHPSESSID=${this.sessionCookie}`;
    return headers;
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

  async autenticar(config: {
    apiBaseUrl: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ accessToken: string; expiresAt: string | null }> {
    if (!config.clientId || !config.clientSecret) {
      throw new FiscalAuthenticationError('AtendeNet/IPM: login/senha não informados.');
    }
    const token = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    return { accessToken: token, expiresAt: null };
  }

  private xmlEscape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    // Não remover "/" — conteúdo texto em XML não exige isso e códigos tipo CNAE 4744-0/05 ficariam inválidos.
  }

  private tag(name: string, value: string | number | null | undefined, required = false): string {
    if (value === null || value === undefined || String(value).trim() === '') {
      if (required) throw new FiscalIntegrationError(`Campo obrigatório ausente no XML IPM: <${name}>.`);
      return '';
    }
    return `<${name}>${this.xmlEscape(String(value))}</${name}>`;
  }

  private onlyDigits(v: string | null | undefined): string {
    return String(v || '').replace(/\D/g, '');
  }

  private formatMoney(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }

  /** Alíquota ISS em % — NTE/IPM: vírgula decimal, 4 casas (ex.: 2,0000), conforme manual. */
  private formatAliquota(v: number): string {
    const x = Number.isFinite(v) ? v : 0;
    const n = Math.min(99.9999, Math.max(0, x));
    return n.toFixed(4).replace('.', ',');
  }

  /** Aceita número ou string JSONB ("2,5", "3.75"). */
  private parseIssPercent(raw: unknown): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (raw == null || raw === '') return NaN;
    const s = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  /**
   * IPM erro 00034: alíquota deve bater com a tabela do município para o item/serviço.
   * Usar primeiro o valor do preview/pedido (`payload.aliquotaIss`); `config.aliquotaIss` só como fallback
   * (evita config fiscal global sobrescrever a alíquota do cadastro de serviço do pedido).
   */
  private resolveAliquotaItemLista(payload: EmitirProviderPayload): number {
    const raw = payload.aliquotaIss ?? payload.config?.aliquotaIss;
    if (raw === null || raw === undefined) return 2;
    const n = this.parseIssPercent(raw);
    return Number.isFinite(n) ? n : 2;
  }

  /** Município do tomador / local da prestação (cadeia atual do payload). */
  private resolveCodigoMunicipioTomadorOuLocal(payload: EmitirProviderPayload): string {
    const { cliente, prestador, config } = payload;
    const bruto = String(cliente.municipio || config?.codigoMunicipio || prestador?.codigoMunicipio || '').trim();
    return normalizarCodigoMunicipioIpm(bruto);
  }

  /** Município de incidência do prestador no cadastro municipal (não confundir com o do tomador). */
  private resolveCodigoMunicipioPrestador(payload: EmitirProviderPayload): string {
    const { cliente, prestador, config } = payload;
    const bruto = String(prestador?.codigoMunicipio || config?.codigoMunicipio || cliente.municipio || '').trim();
    return normalizarCodigoMunicipioIpm(bruto);
  }

  /**
   * Erro IPM 00383: código só com 4 dígitos (ex.: 0709) sem desdobramento nacional.
   * Complementa com 2 dígitos (padrão "01") quando vier apenas o item LC 116.
   * Se o cadastro já tiver 6+ dígitos, mantém. Sufixo configurável em `codigo_desdobramento_nacional` na config fiscal (JSON).
   */
  private normalizeCodigoListaServicoIpM(
    raw: string,
    config?: EmitirProviderPayload['config'],
  ): string {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.length > 0 && d.length < 4) d = d.padStart(4, '0');
    const sufixo = String((config as Record<string, unknown> | undefined)?.codigo_desdobramento_nacional ?? '01')
      .replace(/\D/g, '')
      .padStart(2, '0')
      .slice(0, 2) || '01';
    if (d.length === 4) {
      d = `${d}${sufixo}`;
    }
    // Portal pode exibir 70901 (5 dígitos) — mesmo item LC 116 7.09.01 que no XML costuma ser 070901.
    if (d.length === 5) {
      d = d.padStart(6, '0');
    }
    return d;
  }

  /** IPM: situacao_tributaria (0=TI, 1=TIRF, …). Só dígitos. */
  private resolveSituacaoTributaria(config?: EmitirProviderPayload['config']): string {
    const raw = String((config as Record<string, unknown> | undefined)?.situacaoTributariaIpm ?? '0').trim();
    const d = raw.replace(/\D/g, '');
    return d.length > 0 ? d.slice(0, 3) : '0';
  }

  private resolveTributaSn(raw: unknown, fallback: 'S' | 'N'): 'S' | 'N' {
    const s = String(raw ?? '').trim().toUpperCase();
    if (s.startsWith('S')) return 'S';
    if (s.startsWith('N')) return 'N';
    return fallback;
  }

  private buildEmissaoXml(payload: EmitirProviderPayload): string {
    const { cliente, itens, prestador, config, reformaTributaria } = payload;
    const codigoMunicipioLocal = this.resolveCodigoMunicipioTomadorOuLocal(payload);
    const codigoMunicipioPrestador = this.resolveCodigoMunicipioPrestador(payload);
    const codigoServico = this.normalizeCodigoListaServicoIpM(
      String(config?.itemListaServico || payload.codigoServico || '0709'),
      config,
    );
    const aliquota = this.resolveAliquotaItemLista(payload);
    const doc = this.onlyDigits(cliente.documento);
    const tomadorTipo = cliente.idEstrangeiro ? 'E' : doc.length === 11 ? 'F' : 'J';
    const serieRps = String(config?.serieRps || '1');
    const useReformaItem = Boolean(reformaTributaria?.cbsHabilitado || reformaTributaria?.ibsHabilitado);
    const situacaoTrib = this.resolveSituacaoTributaria(config);
    const cfgRec = config as Record<string, unknown> | undefined;
    const tribPrest = this.resolveTributaSn(cfgRec?.tributaMunicipioPrestadorIpm, 'N');
    const tribTomCfg = cfgRec?.tributaMunicipioTomadorIpm;
    const tribTom = tribTomCfg != null && String(tribTomCfg).trim() !== ''
      ? this.resolveTributaSn(tribTomCfg, 'N')
      : 'N';

    const itensXml = itens.map((item) => {
      const valor = item.valorUnitario * item.quantidade;
      const linhas: string[] = [
        '<lista>',
        this.tag('codigo_local_prestacao_servico', codigoMunicipioLocal, true),
      ];
      // Cascavel/IPM: XSD costuma tipar codigo_nbs como xs:integer — o literal "1.09.01.00-00" (NBS) quebra validação.
      // Só enviar NBS quando reforma tributária estiver ligada na config, e apenas com dígitos (ex.: 109010000).
      if (useReformaItem) {
        const nbsDigits = String((config as Record<string, unknown> | undefined)?.codigo_nbs ?? '109010000').replace(/\D/g, '');
        if (nbsDigits.length > 0) {
          linhas.push(this.tag('codigo_nbs', nbsDigits, true));
        }
      }
      const codAtividade = String((config as Record<string, unknown> | undefined)?.codigoAtividade ?? '').trim();
      linhas.push(
        this.tag('codigo_item_lista_servico', codigoServico, true),
        this.tag('descritivo', item.descricao, true),
        this.tag('aliquota_item_lista_servico', this.formatAliquota(aliquota), true),
        this.tag('situacao_tributaria', situacaoTrib, true),
        this.tag('valor_tributavel', this.formatMoney(valor), true),
      );
      if (codAtividade) {
        linhas.push(this.tag('codigo_atividade', codAtividade));
      }
      linhas.push(
        this.tag('tributa_municipio_prestador', tribPrest, true),
        this.tag('tributa_municipio_tomador', tribTom),
        '</lista>',
      );
      return linhas.join('');
    }).join('');

    const ibsCbsXml = (reformaTributaria?.cbsHabilitado || reformaTributaria?.ibsHabilitado) ? [
      '<IBSCBS>',
      this.tag('finNFSe', '0', true),
      this.tag('indFinal', '0', true),
      this.tag('cIndOp', '020101', true),
      '<valores><trib><gIBSCBS>',
      this.tag('CST', '011', true),
      this.tag('cClassTrib', '011004', true),
      '</gIBSCBS></trib></valores>',
      '</IBSCBS>',
    ].join('') : '';

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<nfse>',
      '<nf>',
      this.tag('serie_nfse', serieRps),
      this.tag('valor_total', this.formatMoney(payload.valorTotal), true),
      this.tag('observacao', payload.observacoesFiscais || `Pedidos: ${payload.referenciaPedidos.join(', ')}`),
      '</nf>',
      '<prestador>',
      this.tag('cpfcnpj', this.onlyDigits(prestador?.cnpj), true),
      this.tag('cidade', codigoMunicipioPrestador, true),
      '</prestador>',
      '<tomador>',
      this.tag('tipo', tomadorTipo, true),
      this.tag('cpfcnpj', doc),
      this.tag('nome_razao_social', cliente.nome, true),
      this.tag('logradouro', cliente.endereco),
      this.tag('numero_residencia', cliente.numero),
      this.tag('bairro', cliente.bairro),
      this.tag('cidade', codigoMunicipioLocal),
      this.tag('cep', this.onlyDigits(cliente.cep)),
      this.tag('estado', cliente.uf),
      this.tag('email', cliente.email),
      this.tag('ddd_fone_comercial', this.onlyDigits(cliente.telefone).slice(0, 2)),
      this.tag('fone_comercial', this.onlyDigits(cliente.telefone).slice(2, 11)),
      '</tomador>',
      '<itens>',
      itensXml,
      '</itens>',
      ibsCbsXml,
      '</nfse>',
    ].join('');
  }

  private buildConsultaXml(externalId: string): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<nfse><pesquisa>',
      this.tag('codigo_autenticidade', externalId, true),
      '</pesquisa></nfse>',
    ].join('');
  }

  private buildCancelXml(externalId: string, reason: string): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<nfse><nf>',
      this.tag('numero', externalId, true),
      this.tag('serie_nfse', '1', true),
      this.tag('situacao', 'C', true),
      this.tag('observacao', reason),
      '</nf></nfse>',
    ].join('');
  }

  private async enviarXml(ctx: FiscalProviderContext, xml: string): Promise<string> {
    const baseUrl = this.resolveBaseUrl(ctx);
    const sendOnce = async (url: string) => {
      const formData = new FormData();
      formData.append('arquivo', new Blob([xml], { type: 'text/xml' }), 'arquivo.xml');
      const res = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.authHeaders(ctx),
        body: formData,
      });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const m = /PHPSESSID=([^;]+)/i.exec(setCookie);
        if (m?.[1]) this.sessionCookie = m[1];
      }
      const buf = await res.arrayBuffer();
      const text = decodeTextResponseBytes(buf, res.headers.get('content-type'));
      if (!res.ok) {
        throw new FiscalIntegrationError(`AtendeNet/IPM: HTTP ${res.status} - ${text.slice(0, 500)}`, {
          httpStatus: res.status,
          body: { url },
        });
      }
      return text;
    };

    try {
      return await sendOnce(baseUrl);
    } catch (error: any) {
      const causeCode = String(error?.cause?.code || '');
      const isTimeout = causeCode.includes('UND_ERR_CONNECT_TIMEOUT') || String(error?.message || '').includes('fetch failed');
      const fallbackUrl = this.buildFallbackBaseUrl(baseUrl);
      if (!isTimeout || !fallbackUrl) throw error;

      FiscalLogger.warn('fiscal.atendenet.fallback_base_url', {
        from: baseUrl,
        to: fallbackUrl,
        reason: causeCode || String(error?.message || 'timeout'),
      });
      return sendOnce(fallbackUrl);
    }
  }

  private extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
    const match = regex.exec(xml);
    return match?.[1]?.trim() || null;
  }

  private parseMensagem(xml: string): string {
    const codes = Array.from(xml.matchAll(/<codigo>([\s\S]*?)<\/codigo>/gi)).map((m) => m[1].trim());
    if (codes.length > 0) return codes.join(' | ');
    const msg = this.extractTag(xml, 'mensagem');
    return msg || 'Resposta recebida do webservice IPM.';
  }

  private mapXmlToResult(
    ctx: FiscalProviderContext,
    payload: EmitirProviderPayload,
    requestXml: string,
    responseXml: string,
  ): EmitirProviderResult {
    const numero = this.extractTag(responseXml, 'numero_nfse') || this.extractTag(responseXml, 'numero') || '';
    const link = this.extractTag(responseXml, 'link_nfse') || null;
    const codVerificador = this.extractTag(responseXml, 'cod_verificador_autenticidade') || null;
    const sucesso = /sucesso|válida para emissão|nfs-e válida/i.test(this.parseMensagem(responseXml)) || Boolean(link);

    let mensagem = this.parseMensagem(responseXml);
    if (!sucesso && /00034/i.test(mensagem)) {
      const temCodAtiv = String((payload.config as Record<string, unknown> | undefined)?.codigoAtividade ?? '').trim();
      mensagem += temCodAtiv
        ? ' | O webservice cruza alíquota com item LC116 e cadastro do prestador. Se o campo “código de tributação municipal” (XML codigo_atividade) estiver com CNAE em vez do código da prefeitura para aquele serviço, o IPM pode responder 00034 mesmo mudando a alíquota. Confira no portal o código de tributação do serviço e a alíquota vinculada.'
        : ' | Confira alíquota e item LC116 no portal do contribuinte. Em Cascavel/IPM costuma ser obrigatório também o código de tributação municipal do serviço (Fiscal → Configurações).';
    }

    return {
      externalId: codVerificador || numero || payload.idempotencyKey,
      numeroNota: numero,
      serie: String(payload.config?.serieRps || '1'),
      status: sucesso ? 'emitida' : 'erro',
      ambiente: ctx.ambiente,
      chaveAcesso: codVerificador || undefined,
      protocolo: codVerificador || undefined,
      xmlUrl: link || undefined,
      pdfUrl: link || undefined,
      providerRequest: { xmlEnviado: requestXml, authorization: '[MASKED]' },
      providerResponse: { xmlRetorno: responseXml },
      mensagem,
    };
  }

  async emitir(ctx: FiscalProviderContext, payload: EmitirProviderPayload): Promise<EmitirProviderResult> {
    const bodyXml = this.buildEmissaoXml(payload);

    const codigoItemLog = this.normalizeCodigoListaServicoIpM(
      String(payload.config?.itemListaServico || payload.codigoServico || '0709'),
      payload.config,
    );
    const aliquotaLog = this.resolveAliquotaItemLista(payload);
    const municipioLocalLog = this.resolveCodigoMunicipioTomadorOuLocal(payload);
    const municipioPrestadorLog = this.resolveCodigoMunicipioPrestador(payload);
    const cfgL = payload.config as Record<string, unknown> | undefined;
    FiscalLogger.info('atendenet.emitir.start', {
      idempotencyKey: payload.idempotencyKey,
      ambiente: ctx.ambiente,
      valorTotal: payload.valorTotal,
      clienteNome: payload.cliente.nome,
      itemListaServico: codigoItemLog,
      aliquotaIss: aliquotaLog,
      codigoMunicipioLocalXml: municipioLocalLog,
      codigoMunicipioPrestadorXml: municipioPrestadorLog,
      codigoAtividade: String(cfgL?.codigoAtividade ?? '').trim() || undefined,
      situacaoTributariaIpm: this.resolveSituacaoTributaria(payload.config),
      tributaMunicipioPrestadorIpm: this.resolveTributaSn(cfgL?.tributaMunicipioPrestadorIpm, 'N'),
      tributaMunicipioTomadorIpm: cfgL?.tributaMunicipioTomadorIpm != null && String(cfgL.tributaMunicipioTomadorIpm).trim() !== ''
        ? this.resolveTributaSn(cfgL.tributaMunicipioTomadorIpm, 'N')
        : 'N',
    });

    const xmlRetorno = await withRetry(
      async () => {
        return this.enviarXml(ctx, bodyXml);
      },
      { label: 'atendenet.emitir', correlationId: payload.idempotencyKey },
    );

    const result = this.mapXmlToResult(ctx, payload, bodyXml, xmlRetorno);

    FiscalLogger.info('atendenet.emitir.success', {
      idempotencyKey: payload.idempotencyKey,
      nota_status: result.status,
      numero_nfse: result.numeroNota,
    });

    if (result.status === 'erro') {
      FiscalLogger.warn('atendenet.emitir.resposta_erro', {
        idempotencyKey: payload.idempotencyKey,
        mensagem: result.mensagem,
        retornoXmlPreview: xmlRetorno.replace(/\s+/g, ' ').slice(0, 900),
      });
    }

    return result;
  }

  async consultarStatus(ctx: FiscalProviderContext, externalId: string): Promise<Record<string, unknown>> {
    return withRetry(async () => {
      const xml = await this.enviarXml(ctx, this.buildConsultaXml(externalId));
      return {
        rawXml: xml,
        mensagem: this.parseMensagem(xml),
        numero_nfse: this.extractTag(xml, 'numero_nfse') || this.extractTag(xml, 'numero'),
        link_nfse: this.extractTag(xml, 'link_nfse'),
        codigo_autenticidade: this.extractTag(xml, 'cod_verificador_autenticidade'),
      };
    }, { label: 'atendenet.consultar', correlationId: externalId });
  }

  async cancelar(ctx: FiscalProviderContext, input: CancelarProviderPayload): Promise<Record<string, unknown>> {
    return withRetry(async () => {
      const xml = await this.enviarXml(ctx, this.buildCancelXml(input.externalId, input.reason));
      return { rawXml: xml, mensagem: this.parseMensagem(xml) };
    }, { label: 'atendenet.cancelar', correlationId: input.externalId });
  }

  async baixarXml(ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    const status = await this.consultarStatus(ctx, externalId);
    return { xmlUrl: String(status.link_nfse || '') || null };
  }

  async baixarPdf(ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    const status = await this.consultarStatus(ctx, externalId);
    return { pdfUrl: String(status.link_nfse || '') || null };
  }
}
