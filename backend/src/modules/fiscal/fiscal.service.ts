import { FiscalAuthService } from './fiscal.auth.service';
import { FiscalAuditService } from './fiscal.audit.service';
import { FiscalIdempotencyService } from './fiscal.idempotency.service';
import { FiscalMapper } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import { FiscalOperacao, NotaFiscalStatus } from './fiscal.constants';
import {
  FiscalConfigurationError,
  FiscalConflictError,
  FiscalNotFoundError,
  FiscalValidationError,
} from './fiscal.errors';
import { assertCanTransition, mapProviderStatus } from './fiscal.status-machine';
import type { EmitirNotaDTO } from './fiscal.types';
import { FiscalValidationService } from './fiscal.validation.service';
import { validateProviderPayload } from './fiscal.payload-validator';
import { FiscalLogger } from './fiscal.logger';
import { providerFactory } from './providers/provider.factory';
import { env } from '../../config/env';

export class FiscalService {
  constructor(
    private readonly repo: FiscalRepository,
    private readonly validation: FiscalValidationService,
    private readonly auth: FiscalAuthService,
    private readonly mapper: FiscalMapper,
    private readonly idempotency: FiscalIdempotencyService,
    private readonly audit: FiscalAuditService,
  ) {}

  async validarPedido(pedidoId: number) {
    return this.validation.validarPedidoParaEmissao(pedidoId);
  }

  async preview(pedidoIds: number[], faturaId: number | null) {
    return this.validation.validarLote(pedidoIds, faturaId);
  }

  async emitir(input: EmitirNotaDTO, userId: string, correlationId: string) {
    const pedidoIds = input.pedidoIds.map(Number).filter((n) => Number.isFinite(n));
    const faturaId = input.faturaId ? Number(input.faturaId) : null;

    // ── 1. Validação do lote ────────────────────────────────────────────────
    const validationResult = await this.validation.validarLote(pedidoIds, faturaId);

    if (!validationResult.apto_para_emissao && !input.forcarEmissao) {
      return {
        ok: false,
        validation: validationResult,
        nota: null,
        idempotent: false,
      };
    }

    if (!validationResult.preview) {
      throw new FiscalValidationError('Preview fiscal não pôde ser montado — pedidos não encontrados.');
    }

    const preview = validationResult.preview;

    // ── 2. Idempotência ─────────────────────────────────────────────────────
    const idempotencyKey = this.idempotency.buildKey(pedidoIds, faturaId, input.observacoesFiscais);
    const idempotencyResult = await this.idempotency.check(idempotencyKey);

    if (!idempotencyResult.shouldProceed && idempotencyResult.existingNota) {
      return {
        ok: true,
        validation: validationResult,
        nota: this.mapper.mapNotaRowToResponse(idempotencyResult.existingNota),
        idempotent: true,
      };
    }

    const retryNotaId =
      idempotencyResult.shouldProceed &&
      idempotencyResult.existingNota &&
      ['erro', NotaFiscalStatus.ERRO_INTEGRACAO].includes(
        String((idempotencyResult.existingNota as Record<string, unknown>).status),
      )
        ? Number((idempotencyResult.existingNota as Record<string, unknown>).id)
        : null;

    // ── 3. Configuração fiscal ──────────────────────────────────────────────
    const config = await this.repo.getConfiguracaoFiscalAtiva(preview.empresaId);
    if (!config) {
      throw new FiscalConfigurationError(
        'Configuração fiscal ativa não encontrada. Execute a migration de seed (20260415000000_fiscal_sprint1_hardening.sql).',
      );
    }

    const overrideCodigoAtividade =
      input.codigoAtividadeMunicipal != null && String(input.codigoAtividadeMunicipal).trim() !== ''
        ? String(input.codigoAtividadeMunicipal).trim()
        : null;
    const configForEmit = {
      ...config,
      ...(overrideCodigoAtividade ? { codigo_atividade: overrideCodigoAtividade } : {}),
    } as Record<string, unknown>;

    // ── 4. Autenticação e provider ──────────────────────────────────────────
    const providerNome = this.resolveProviderNome(config.provedor_fiscal);
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const provider = providerFactory(providerNome);
    const providerPayload = this.mapper.mapPedidoPreviewToProviderPayload(
      preview,
      input.observacoesFiscais,
      idempotencyKey,
      configForEmit as Record<string, any>,
    );

    // ── 4b. Validação do schema do payload antes do envio ───────────────────
    FiscalLogger.info('fiscal.emitir.validating_payload', {
      idempotencyKey,
      provider: providerNome,
      pedidoIds,
      correlationId,
    });
    validateProviderPayload(providerPayload, {
      fiscalApiBaseUrl: (config.api_base_url as string | null) || null,
    });

    // ── 5. Chamada ao provider ──────────────────────────────────────────────
    const providerCtx = {
      accessToken:  authResult.accessToken,
      apiBaseUrl:   config.api_base_url || null,
      ambiente:     env.fiscal.ambienteOverride || config.ambiente || 'homologacao',
      providerType: providerNome,
    };

    FiscalLogger.info('fiscal.emitir.calling_provider', {
      idempotencyKey,
      provider: providerNome,
      ambiente: providerCtx.ambiente,
      correlationId,
    });

    const providerResponse = await provider.emitir(providerCtx, providerPayload);

    // ── 6. Persiste atomicamente: nota + vínculos + update pedidos ──────────
    const notaData = this.mapper.mapProviderResponseToNotaInsert({
      providerResponse,
      preview,
      userId,
      observacoesFiscais: input.observacoesFiscais,
      idempotencyKey,
    });

    let notaRow: Record<string, unknown>;
    if (retryNotaId) {
      notaRow = await this.repo.updateNotaFiscalFromEmitirRetry(
        retryNotaId,
        notaData as Record<string, unknown>,
        userId,
      );
      await this.repo.updatePedidosAposEmissao(
        pedidoIds,
        retryNotaId,
        String((notaData as Record<string, unknown>)['status'] || 'pendente'),
      );
    } else {
      try {
        notaRow = await this.repo.emitirNotaAtomico({
          notaData: notaData as Record<string, unknown>,
          pedidoIds,
          valorTotal: preview.valorTotal,
          usuarioId: userId,
          correlationId,
        });
      } catch (error: any) {
        // Duas requisições simultâneas com a mesma chave: uma faz INSERT, a outra recebe unique_violation (409).
        if (error instanceof FiscalConflictError || error?.code === 'FISCAL_CONFLICT') {
          const detailKey = (error?.details as { idempotencyKey?: string } | undefined)?.idempotencyKey;
          const key = String(detailKey || (notaData as Record<string, unknown>)['external_id'] || idempotencyKey);
          const existing = await this.repo.findNotaByIdempotencyKey(key);
          if (existing) {
            FiscalLogger.warn('fiscal.emitir.idempotency_insert_race', {
              idempotencyKey: key,
              existingNotaId: (existing as { id?: unknown }).id,
              correlationId,
            });
            notaRow = existing as Record<string, unknown>;
          } else {
            throw error;
          }
        } else {
          // Compatibilidade para bancos legados com schema parcial de notas_fiscais.
          const msg = String(error?.message || '');
          const legacySchema =
            error?.code === '42703' ||
            error?.code === '42804' ||
            error?.code === 'PGRST204' ||
            /column .* does not exist|schema cache|status_nota_fiscal/i.test(msg);
          if (!legacySchema) throw error;

          FiscalLogger.warn('fiscal.emitir.legacy_schema_fallback', {
            reason: error?.message,
            correlationId,
          });

          notaRow = await this.repo.createNotaFiscalCompat(notaData as Record<string, unknown>);
          await this.repo.linkNotaPedidos(Number(notaRow['id']), pedidoIds, preview.valorTotal);
          await this.repo.updatePedidosAposEmissao(
            pedidoIds,
            Number(notaRow['id']),
            String((notaData as Record<string, unknown>)['status'] || 'pendente'),
          );
        }
      }
    }

    if (faturaId) await this.repo.updateFaturaNota(faturaId, Number(notaRow['id']));

    FiscalLogger.info('fiscal.emitir.persisted', {
      notaId: notaRow['id'],
      numeroNota: providerResponse.numeroNota,
      status: providerResponse.status,
      idempotencyKey,
      correlationId,
    });

    // ── 7. Auditoria (fire-and-forget) ─────────────────────────────────────
    const statusNovo = mapProviderStatus(providerResponse.status);
    void this.audit.registrarEmissao({
      notaFiscalId: Number(notaRow['id']),
      statusAnterior: retryNotaId ? NotaFiscalStatus.ERRO_INTEGRACAO : NotaFiscalStatus.PENDENTE,
      statusNovo,
      empresaId: preview.empresaId,
      requestPayload: providerPayload as unknown as Record<string, unknown>,
      responsePayload: providerResponse.providerResponse,
      httpStatus: providerResponse.status === 'erro' ? 500 : 200,
      mensagem: providerResponse.mensagem ?? null,
      usuarioId: userId,
      correlationId,
    });

    return {
      ok: true,
      validation: validationResult,
      nota: this.mapper.mapNotaRowToResponse(notaRow),
      idempotent: false,
    };
  }

  async listarNotas(filters: {
    status?: string;
    clienteId?: number;
    pedidoId?: number;
    faturaId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const rows = await this.repo.listNotas({
      status: filters.status,
      clienteId: filters.clienteId,
      pedidoId: filters.pedidoId,
      faturaId: filters.faturaId,
      search: filters.search,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    });
    return rows.map((r) => this.mapper.mapNotaRowToResponse(r));
  }

  async detalharNota(id: number) {
    const row = await this.repo.getNotaById(id);
    return this.mapper.mapNotaRowToResponse(row);
  }

  async getHistoricoEventos(notaId: number) {
    return this.repo.getEventosByNotaId(notaId);
  }

  async consultarStatusNota(id: number, correlationId: string) {
    const nota = await this.repo.getNotaById(id);
    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return { local_status: nota.status, provider_status: null };

    const providerNome = this.resolveProviderNome(config.provedor_fiscal);
    const provider = providerFactory(providerNome);
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;

    const providerStatus = await provider.consultarStatus(
      {
        accessToken:  authResult.accessToken,
        apiBaseUrl:   config.api_base_url || null,
        ambiente:     config.ambiente || 'homologacao',
        providerType: providerNome,
      },
      externalId,
    );

    void this.audit.registrarLog({
      notaFiscalId: nota.id as number,
      empresaId: nota.empresa_id as string | null,
      tipoOperacao: FiscalOperacao.CONSULTA_STATUS,
      requestPayload: { externalId },
      responsePayload: providerStatus as unknown as Record<string, unknown>,
      httpStatus: 200,
      statusIntegracao: String(providerStatus.status || 'desconhecido'),
      correlationId,
    });

    return { local_status: nota.status, provider_status: providerStatus };
  }

  async cancelarNota(id: number, reason: string, userId: string, correlationId: string) {
    const nota = await this.repo.getNotaById(id);
    const currentStatus = nota.status as string;

    // Valida transição EMITIDA → CANCELAMENTO_SOLICITADO
    assertCanTransition(
      currentStatus as Parameters<typeof assertCanTransition>[0],
      NotaFiscalStatus.CANCELAMENTO_SOLICITADO,
      id,
    );

    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) {
      throw new FiscalConfigurationError('Configuração fiscal ativa não encontrada.');
    }

    const providerNome = this.resolveProviderNome(config.provedor_fiscal);
    const provider = providerFactory(providerNome);
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;

    const providerResp = await provider.cancelar(
      {
        accessToken:  authResult.accessToken,
        apiBaseUrl:   config.api_base_url || null,
        ambiente:     config.ambiente || 'homologacao',
        providerType: providerNome,
      },
      { externalId, reason },
    );

    const updated = await this.repo.cancelNota(id, reason, userId);

    void this.audit.registrarLog({
      notaFiscalId: id,
      empresaId: updated.empresa_id as string | null,
      tipoOperacao: FiscalOperacao.CANCELAMENTO_CONCLUIDO,
      requestPayload: { reason, externalId },
      responsePayload: providerResp as unknown as Record<string, unknown>,
      httpStatus: 200,
      statusIntegracao: NotaFiscalStatus.CANCELADA,
      mensagem: reason,
      usuarioId: userId,
      correlationId,
    });

    void this.audit.registrarEvento({
      notaFiscalId: id,
      statusAnterior: currentStatus as Parameters<typeof this.audit.registrarEvento>[0]['statusAnterior'],
      statusNovo: NotaFiscalStatus.CANCELADA,
      descricao: reason,
      usuarioId: userId,
      correlationId,
    });

    return updated;
  }

  private extractStoredXmlFromNota(nota: Record<string, unknown>): string | null {
    const pick = (v: unknown): string | null => {
      if (typeof v !== 'string') return null;
      const t = v.trim();
      if (!t.includes('<') || !t.includes('>')) return null;
      return t;
    };
    const fromObj = (o: unknown, keys: string[]): string | null => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
      const r = o as Record<string, unknown>;
      for (const k of keys) {
        const x = pick(r[k]);
        if (x) return x;
      }
      return null;
    };
    const env = nota.payload_envio;
    const ret = nota.payload_retorno;
    if (typeof env === 'string') {
      const x = pick(env);
      if (x) return x;
    }
    const e1 = fromObj(env, ['xmlEnviado', 'xml', 'arquivo', 'body']);
    if (e1) return e1;
    if (typeof ret === 'string') {
      const x = pick(ret);
      if (x) return x;
    }
    return fromObj(ret, ['xmlRetorno', 'rawXml', 'xml', 'body']);
  }

  private formatIntegracaoPayloadParaVisualizacao(nota: Record<string, unknown>): string | null {
    const xml = this.extractStoredXmlFromNota(nota);
    if (xml) return xml;
    const chunks: string[] = [];
    if (nota.payload_envio !== undefined && nota.payload_envio !== null) {
      chunks.push(
        '=== Envio (payload_envio) ===\n'
          + (typeof nota.payload_envio === 'string'
            ? nota.payload_envio
            : JSON.stringify(nota.payload_envio, null, 2)),
      );
    }
    if (nota.payload_retorno !== undefined && nota.payload_retorno !== null) {
      chunks.push(
        '=== Retorno (payload_retorno) ===\n'
          + (typeof nota.payload_retorno === 'string'
            ? nota.payload_retorno
            : JSON.stringify(nota.payload_retorno, null, 2)),
      );
    }
    return chunks.length ? chunks.join('\n\n') : null;
  }

  private async tryProviderXmlUrl(nota: Record<string, unknown>): Promise<string | null> {
    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return null;
    const providerNome = this.resolveProviderNome(config.provedor_fiscal);
    const provider = providerFactory(providerNome);
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;
    const ctx = {
      accessToken:  authResult.accessToken,
      apiBaseUrl:   config.api_base_url || null,
      ambiente:     config.ambiente || 'homologacao',
      providerType: providerNome,
    };
    const result = await provider.baixarXml(ctx, externalId);
    return result.xmlUrl || null;
  }

  private async tryProviderPdfUrl(nota: Record<string, unknown>): Promise<string | null> {
    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return null;
    const providerNome = this.resolveProviderNome(config.provedor_fiscal);
    const provider = providerFactory(providerNome);
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;
    const ctx = {
      accessToken:  authResult.accessToken,
      apiBaseUrl:   config.api_base_url || null,
      ambiente:     config.ambiente || 'homologacao',
      providerType: providerNome,
    };
    const result = await provider.baixarPdf(ctx, externalId);
    return result.pdfUrl || null;
  }

  /**
   * XML/stream: URL externa, XML gravado em payload_* ou fallback texto (integração).
   */
  async resolveNotaXmlResponse(id: number): Promise<
    | { type: 'redirect'; url: string }
    | { type: 'inline'; body: string; filename: string; mime: string }
  > {
    const nota = await this.repo.getNotaById(id);
    if (nota.xml_url) return { type: 'redirect', url: nota.xml_url as string };
    const storedXml = this.extractStoredXmlFromNota(nota as Record<string, unknown>);
    if (storedXml) {
      return {
        type: 'inline',
        body: storedXml,
        filename: `nfse-${id}.xml`,
        mime: 'application/xml; charset=utf-8',
      };
    }
    const remote = await this.tryProviderXmlUrl(nota as Record<string, unknown>);
    if (remote) return { type: 'redirect', url: remote };
    const fallback = this.formatIntegracaoPayloadParaVisualizacao(nota as Record<string, unknown>);
    if (fallback) {
      return {
        type: 'inline',
        body: fallback,
        filename: `nfse-${id}-integracao.txt`,
        mime: 'text/plain; charset=utf-8',
      };
    }
    throw new FiscalNotFoundError('XML da nota fiscal', id);
  }

  async resolveNotaPdf(id: number): Promise<{ type: 'redirect'; url: string }> {
    const nota = await this.repo.getNotaById(id);
    if (nota.pdf_url) return { type: 'redirect', url: nota.pdf_url as string };
    const remote = await this.tryProviderPdfUrl(nota as Record<string, unknown>);
    if (remote) return { type: 'redirect', url: remote };
    throw new FiscalValidationError(
      'DANFE/PDF não está disponível para esta nota (sem link no provedor ou nota não autorizada).',
      { notaId: id, status: nota.status },
    );
  }

  async buildMailtoReenvioNota(id: number, destinatarioOverride?: string | null): Promise<{ mailtoUrl: string }> {
    const nota = await this.repo.getNotaById(id);
    const cliente = nota.clientes as { email?: string | null; nome?: string | null } | null;
    const rawTo = String(destinatarioOverride || cliente?.email || '').trim();
    if (!rawTo) {
      throw new FiscalValidationError(
        'Não há e-mail do cliente cadastrado. Cadastre um e-mail no cliente antes de reenviar.',
        { notaId: id },
      );
    }
    const num = String(nota.numero || nota.numero_nota || id);
    const subject = `NFS-e ${num} — ${cliente?.nome || 'Cliente'}`;
    const body = [
      'Olá,',
      '',
      'Informações da nota de serviço:',
      `- Número: ${num}`,
      `- Valor: R$ ${Number(nota.valor_total || 0).toFixed(2)}`,
      `- Status: ${nota.status}`,
      nota.mensagem_erro ? `- Mensagem: ${nota.mensagem_erro}` : null,
      '',
      'Quando a nota estiver autorizada, anexe o XML/PDF obtido em Fiscal → Emitidas no sistema.',
      '',
      'Atenciosamente.',
    ].filter(Boolean).join('\n');
    const mailtoUrl = `mailto:${rawTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { mailtoUrl };
  }

  async getKpis() {
    return this.repo.getKpis();
  }

  async getConfiguracoes() {
    const config = await this.repo.getConfiguracaoFiscalAtiva(null);
    if (!config) return null;
    const mask = (v: any) => (v ? '••••' + String(v).slice(-4) : null);
    return {
      ...config,
      api_key:                  mask(config.api_key),
      client_secret:            config.client_secret            ? '••••••••' : null,
      certificate_password_ref: config.certificate_password_ref ? '••••••••' : null,
      focus_token:              mask((config as any).focus_token),
      senha:                    (config as any).senha            ? '••••••••' : null,
      token_atual:              undefined,
    };
  }

  async updateConfiguracoes(body: Record<string, any>) {
    const config = await this.repo.getConfiguracaoFiscalAtiva(null);
    if (!config) throw new FiscalConfigurationError('Configuração fiscal não encontrada.');

    const isMasked = (v: any) => typeof v === 'string' && v.includes('••••');
    const safe = (v: any, fallback: any) => (isMasked(v) || v === undefined ? fallback : v || null);

    const fields: Record<string, any> = {};
    if (body.provedor_fiscal      !== undefined) fields.provedor_fiscal      = body.provedor_fiscal;
    if (body.ambiente             !== undefined) fields.ambiente             = body.ambiente;
    if (body.api_base_url         !== undefined) fields.api_base_url         = body.api_base_url || null;
    if (body.client_id            !== undefined) fields.client_id            = body.client_id    || null;
    if (body.inscricao_municipal  !== undefined) fields.inscricao_municipal  = body.inscricao_municipal || null;
    if (body.municipio_codigo     !== undefined) fields.municipio_codigo     = body.municipio_codigo    || null;
    if (body.regime_tributario    !== undefined) fields.regime_tributario    = body.regime_tributario   || null;
    if (body.codigo_atividade     !== undefined) fields.codigo_atividade     = body.codigo_atividade    || null;
    if (body.item_lista_servico  !== undefined) fields.item_lista_servico   = body.item_lista_servico  || null;
    if (body.serie_rps            !== undefined) fields.serie_rps            = body.serie_rps           || null;
    if (body.aliquota_iss         !== undefined) fields.aliquota_iss         = body.aliquota_iss        ?? null;
    if (body.ipm_situacao_tributaria !== undefined) {
      const s = String(body.ipm_situacao_tributaria ?? '').trim().replace(/\D/g, '').slice(0, 3);
      fields.ipm_situacao_tributaria = s.length ? s : '0';
    }
    if (body.ipm_tributa_municipio_prestador !== undefined) {
      const v = String(body.ipm_tributa_municipio_prestador ?? '').trim().toUpperCase();
      fields.ipm_tributa_municipio_prestador = v.startsWith('S') ? 'S' : 'N';
    }
    if (body.ipm_tributa_municipio_tomador !== undefined) {
      const v = String(body.ipm_tributa_municipio_tomador ?? '').trim().toUpperCase();
      fields.ipm_tributa_municipio_tomador = v.startsWith('S') ? 'S' : 'N';
    }
    if (body.cnpj !== undefined) {
      const raw = String(body.cnpj ?? '').replace(/\D/g, '');
      fields.cnpj = raw.length ? raw : null;
    }
    if (body.razao_social !== undefined) {
      const t = String(body.razao_social ?? '').trim();
      fields.razao_social = t.length ? t : null;
    }
    if (body.login                !== undefined) fields.login                = body.login               || null;
    if (body.api_key        !== undefined) fields.api_key        = safe(body.api_key,        (config as any).api_key);
    if (body.client_secret  !== undefined) fields.client_secret  = safe(body.client_secret,  (config as any).client_secret);
    if (body.focus_token    !== undefined) fields.focus_token    = safe(body.focus_token,    (config as any).focus_token);
    if (body.senha          !== undefined) fields.senha          = safe(body.senha,          (config as any).senha);

    const provider = String(body.provedor_fiscal ?? config.provedor_fiscal ?? '').toLowerCase();
    if (provider === 'atendenet') {
      // Mantém compatibilidade entre campos genéricos e nomenclatura do AtendeNet.
      if (fields.client_id !== undefined && fields.login === undefined) fields.login = fields.client_id;
      if (fields.client_secret !== undefined && fields.senha === undefined) fields.senha = fields.client_secret;
    }
    if (provider === 'focus' && fields.api_key !== undefined && fields.focus_token === undefined) {
      fields.focus_token = fields.api_key;
    }

    return this.repo.updateConfiguracaoFiscal(config.id, fields);
  }

  async testarConexao() {
    const config = await this.repo.getConfiguracaoFiscalAtiva(null);
    if (!config) throw new FiscalConfigurationError('Configuração fiscal não encontrada. Configure antes de testar.');
    const providerNome = this.resolveProviderNome(config.provedor_fiscal);
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const provider = providerFactory(providerNome);
    const probeExternalId = `healthcheck-${Date.now()}`;
    let probeOk = true;
    let probeMensagem = '';

    try {
      await provider.consultarStatus(
        {
          accessToken: authResult.accessToken,
          apiBaseUrl: config.api_base_url || null,
          ambiente: env.fiscal.ambienteOverride || config.ambiente || 'homologacao',
          providerType: providerNome,
        },
        probeExternalId,
      );
      probeMensagem = 'Consulta de status ao webservice executada.';
    } catch (error: any) {
      const rawMessage = String(error?.message || '');
      // 404 em ID inexistente indica conectividade/auth ok no endpoint de status.
      if (rawMessage.includes('HTTP 404')) {
        probeMensagem = 'Webservice respondeu ao teste de status (404 esperado para ID de teste).';
      } else {
        probeOk = false;
        probeMensagem = rawMessage || 'Falha ao consultar webservice.';
      }
    }

    const ok = Boolean(authResult?.accessToken);
    return {
      ok: ok && probeOk,
      message: ok && probeOk
        ? `Conexão estabelecida com sucesso. ${probeMensagem}`.trim()
        : `Falha na validação do webservice. ${probeMensagem}`.trim(),
      provider: providerNome,
      ambiente: config.ambiente,
    };
  }

  private resolveProviderNome(configProvider: string | null | undefined): string {
    const providerNome = (env.fiscal.providerOverride || configProvider || '').toLowerCase();
    if (!providerNome) {
      throw new FiscalConfigurationError('Provedor fiscal não configurado. Selecione um provedor real antes de emitir/testar.');
    }
    if (providerNome === 'mock') {
      throw new FiscalConfigurationError('Provider mock está desabilitado neste ambiente. Configure um provedor real para produção.');
    }
    return providerNome;
  }
}
