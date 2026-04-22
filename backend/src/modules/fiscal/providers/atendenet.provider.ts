/**
 * AtendeNetProvider — Integração com AtendeNet NFS-e.
 *
 * Autenticação: POST {baseUrl}/api/v1/login com { usuario, senha }.
 *   Retorna { token, expira_em } → usado como Bearer.
 *
 * A autenticação é gerenciada pelo FiscalAuthService, que cacheia o token.
 * Este provider recebe o token já válido via FiscalProviderContext.accessToken.
 *
 * Endpoints:
 *   POST   {baseUrl}/api/v1/nfse            — emissão
 *   GET    {baseUrl}/api/v1/nfse/{id}        — consulta status
 *   POST   {baseUrl}/api/v1/nfse/{id}/cancelar — cancelamento
 *   GET    {baseUrl}/api/v1/nfse/{id}/xml    — XML
 *   GET    {baseUrl}/api/v1/nfse/{id}/pdf    — PDF
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

export class AtendeNetProvider implements IFiscalProvider {

  private bearerHeaders(ctx: FiscalProviderContext): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${ctx.accessToken}`,
    };
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

  /**
   * Autenticação AtendeNet: usada pelo FiscalAuthService via interface optativa.
   * Recebe login/senha, retorna token + expiração.
   */
  async autenticar(config: {
    apiBaseUrl: string;
    clientId: string;    // usado como "login" no AtendeNet
    clientSecret: string; // usado como "senha" no AtendeNet
  }): Promise<{ accessToken: string; expiresAt: string | null }> {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: config.clientId,
        senha:   config.clientSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new FiscalAuthenticationError(
        `AtendeNet: falha na autenticação — HTTP ${res.status}: ${body.slice(0, 200)}`,
      );
    }

    const payload = (await res.json()) as Record<string, unknown>;
    const token   = String(payload.token || payload.access_token || '');
    if (!token) throw new FiscalAuthenticationError('AtendeNet: resposta de login sem token.');

    const expiresIn  = Number(payload.expires_in || payload.expira_em || 3600);
    const expiresAt  = new Date(Date.now() + expiresIn * 1000).toISOString();

    return { accessToken: token, expiresAt };
  }

  private buildAtendeNetPayload(payload: EmitirProviderPayload): Record<string, unknown> {
    const { cliente, itens, prestador, config, reformaTributaria } = payload;
    const aliquota = config?.aliquotaIss ?? payload.aliquotaIss ?? 2.0;
    const valorServicos = payload.valorTotal;
    const valorIss      = Number(((valorServicos * aliquota) / 100).toFixed(2));

    // ── Tomador ────────────────────────────────────────────────────────────────
    const tomador: Record<string, unknown> = {
      razaoSocial: cliente.nome,
      email:       cliente.email  || undefined,
      telefone:    cliente.telefone?.replace(/\D/g, '') || undefined,
    };

    if (cliente.idEstrangeiro) {
      tomador.idEstrangeiro = cliente.idEstrangeiro;
      tomador.pais          = cliente.pais || 'Brasil';
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
        codigoMunicipio:  Number(cliente.municipio || config?.codigoMunicipio || prestador?.codigoMunicipio || 0),
        uf:               cliente.uf         || '',
        cep:              (cliente.cep || '').replace(/\D/g, ''),
      };
    }

    // ── Discriminação dos serviços ─────────────────────────────────────────────
    const discriminacao = itens.map((i) => i.descricao).join('\n');

    const servico: Record<string, unknown> = {
      discriminacao,
      itemListaServico:            config?.itemListaServico      || payload.codigoServico || '7.09',
      codigoTributacaoMunicipio:   config?.itemListaServico      || payload.codigoServico || '7.09',
      codigoMunicipio:             Number(config?.codigoMunicipio || prestador?.codigoMunicipio || 0),
      valores: {
        valorServicos,
        aliquota,
        valorIss,
        issRetido: false,
      },
    };

    // ── Reforma Tributária 2026+ ───────────────────────────────────────────────
    if (reformaTributaria?.cbsHabilitado || reformaTributaria?.ibsHabilitado) {
      const rt: Record<string, unknown> = {};
      if (reformaTributaria.cbsHabilitado) {
        rt.cbsValor    = reformaTributaria.cbsValor;
        rt.cbsAliquota = reformaTributaria.cbsAliquota;
      }
      if (reformaTributaria.ibsHabilitado) {
        rt.ibsMunicipioValor            = reformaTributaria.ibsMunValor;
        rt.ibsUfValor                   = reformaTributaria.ibsUfValor;
        rt.ibsCbsBaseCalculo            = reformaTributaria.ibsCbsBaseCalculo;
        rt.ibsCbsSituacaoTributaria     = reformaTributaria.ibsCbsSituacaoTributaria;
      }
      servico.reformaTributaria = rt;
    }

    return {
      rps: {
        serie: config?.serieRps || '13',
        tipo:  1,
      },
      competencia:             new Date().toISOString().slice(0, 7),
      naturezaOperacao:        config?.naturezaOperacao ?? 1,
      regimeTributario:        config?.regimeTributario ?? 1,
      optanteSimplesNacional:  config?.regimeTributario === 6,
      servico,
      tomador,
      prestador: prestador ? {
        cnpj:               prestador.cnpj?.replace(/\D/g, '') || undefined,
        inscricaoMunicipal: prestador.inscricaoMunicipal       || undefined,
      } : undefined,
    };
  }

  async emitir(ctx: FiscalProviderContext, payload: EmitirProviderPayload): Promise<EmitirProviderResult> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('AtendeNet: api_base_url não configurada.');

    const body = this.buildAtendeNetPayload(payload);

    FiscalLogger.info('atendenet.emitir.start', {
      idempotencyKey: payload.idempotencyKey,
      ambiente: ctx.ambiente,
      valorTotal: payload.valorTotal,
      clienteNome: payload.cliente.nome,
    });

    const { res, json } = await withRetry(
      async () => {
        const r = await this.fetchWithTimeout(`${ctx.apiBaseUrl}/api/v1/nfse`, {
          method:  'POST',
          headers: { ...this.bearerHeaders(ctx), 'X-Idempotency-Key': payload.idempotencyKey },
          body:    JSON.stringify(body),
        });
        const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
        if (!r.ok) {
          const mensagem = this.extractErrorMessage(j, r.status);
          throw new FiscalIntegrationError(`AtendeNet: emissão falhou — ${mensagem}`, {
            httpStatus: r.status, body: j,
            retryAfter: r.headers.get('retry-after'),
          });
        }
        return { res: r, json: j };
      },
      { label: 'atendenet.emitir', correlationId: payload.idempotencyKey },
    );

    const status = this.mapAtendeNetStatus(String(json.status || json.situacao || ''));
    const nfse   = (json.nfse || json) as Record<string, unknown>;

    FiscalLogger.info('atendenet.emitir.success', {
      idempotencyKey: payload.idempotencyKey,
      http_status: res.status,
      nota_status: status,
      numero_nfse: nfse.numero || nfse.numeroNfse,
    });

    return {
      externalId:       String(json.protocolo || json.id || payload.idempotencyKey),
      numeroNota:       String(nfse.numero || nfse.numeroNfse || ''),
      serie:            String(nfse.serie  || (body.rps as any)?.serie || '1'),
      status,
      ambiente:         ctx.ambiente,
      chaveAcesso:      nfse.codigoVerificacao ? String(nfse.codigoVerificacao) : undefined,
      protocolo:        json.protocolo          ? String(json.protocolo)          : undefined,
      xmlUrl:           nfse.linkXml            ? String(nfse.linkXml)            : undefined,
      pdfUrl:           nfse.linkPdf            ? String(nfse.linkPdf)            : undefined,
      providerRequest:  { ...body, authorization: '[MASKED]' },
      providerResponse: json,
      mensagem:         json.mensagem ? String(json.mensagem) : undefined,
    };
  }

  async consultarStatus(ctx: FiscalProviderContext, externalId: string): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('AtendeNet: api_base_url não configurada.');
    return withRetry(async () => {
      const res  = await this.fetchWithTimeout(
        `${ctx.apiBaseUrl}/api/v1/nfse/${encodeURIComponent(externalId)}`,
        { headers: this.bearerHeaders(ctx) },
      );
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new FiscalIntegrationError(`AtendeNet: consulta retornou HTTP ${res.status}`, {
          httpStatus: res.status, json,
        });
      }
      return json;
    }, { label: 'atendenet.consultar', correlationId: externalId });
  }

  async cancelar(ctx: FiscalProviderContext, input: CancelarProviderPayload): Promise<Record<string, unknown>> {
    if (!ctx.apiBaseUrl) throw new FiscalIntegrationError('AtendeNet: api_base_url não configurada.');
    return withRetry(async () => {
      const res  = await this.fetchWithTimeout(
        `${ctx.apiBaseUrl}/api/v1/nfse/${encodeURIComponent(input.externalId)}/cancelar`,
        {
          method:  'POST',
          headers: this.bearerHeaders(ctx),
          body:    JSON.stringify({ motivo: input.reason }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const mensagem = this.extractErrorMessage(json, res.status);
        throw new FiscalIntegrationError(`AtendeNet: cancelamento falhou — ${mensagem}`, {
          httpStatus: res.status, body: json,
          retryAfter: res.headers.get('retry-after'),
        });
      }
      return json;
    }, { label: 'atendenet.cancelar', correlationId: input.externalId });
  }

  async baixarXml(ctx: FiscalProviderContext, externalId: string): Promise<{ xmlUrl: string | null }> {
    if (!ctx.apiBaseUrl) return { xmlUrl: null };
    const res = await this.fetchWithTimeout(
      `${ctx.apiBaseUrl}/api/v1/nfse/${encodeURIComponent(externalId)}/xml`,
      { headers: this.bearerHeaders(ctx) },
    );
    if (!res.ok) return { xmlUrl: null };
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { xmlUrl: (json.link || json.url || json.xml_url) as string | null ?? null };
  }

  async baixarPdf(ctx: FiscalProviderContext, externalId: string): Promise<{ pdfUrl: string | null }> {
    if (!ctx.apiBaseUrl) return { pdfUrl: null };
    const res = await this.fetchWithTimeout(
      `${ctx.apiBaseUrl}/api/v1/nfse/${encodeURIComponent(externalId)}/pdf`,
      { headers: this.bearerHeaders(ctx) },
    );
    if (!res.ok) return { pdfUrl: null };
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { pdfUrl: (json.link || json.url || json.pdf_url) as string | null ?? null };
  }

  private mapAtendeNetStatus(s: string): 'emitida' | 'pendente' | 'erro' {
    const lower = s.toLowerCase();
    if (['autorizado', 'emitido', 'ativo'].includes(lower))          return 'emitida';
    if (['processando', 'aguardando', 'pendente'].includes(lower))    return 'pendente';
    if (['erro', 'negado', 'rejeitado', 'cancelado'].includes(lower)) return 'erro';
    return 'pendente';
  }

  private extractErrorMessage(json: Record<string, unknown>, httpStatus: number): string {
    const erros = Array.isArray(json.erros)
      ? (json.erros as any[]).map((e: any) => e.mensagem || e.message || String(e)).join('; ')
      : null;
    return erros || String(json.mensagem || json.message || `HTTP ${httpStatus}`);
  }
}
