import { FiscalAuthService } from './fiscal.auth.service';
import { FiscalAuditService } from './fiscal.audit.service';
import { FiscalIdempotencyService } from './fiscal.idempotency.service';
import { FiscalMapper } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import { FiscalOperacao, NotaFiscalStatus } from './fiscal.constants';
import { FiscalConfigurationError, FiscalValidationError } from './fiscal.errors';
import { assertCanTransition, mapProviderStatus } from './fiscal.status-machine';
import type { EmitirNotaDTO } from './fiscal.types';
import { FiscalValidationService } from './fiscal.validation.service';
import { providerFactory } from './providers/provider.factory';

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

    // ── 3. Configuração fiscal ──────────────────────────────────────────────
    const config = await this.repo.getConfiguracaoFiscalAtiva(preview.empresaId);
    if (!config) {
      throw new FiscalConfigurationError(
        'Configuração fiscal ativa não encontrada. Execute a migration de seed (20260415000000_fiscal_sprint1_hardening.sql).',
      );
    }

    // ── 4. Autenticação e provider ──────────────────────────────────────────
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const providerPayload = this.mapper.mapPedidoPreviewToProviderPayload(
      preview,
      input.observacoesFiscais,
      idempotencyKey,
    );

    // ── 5. Chamada ao provider ──────────────────────────────────────────────
    const providerCtx = {
      accessToken: authResult.accessToken,
      apiBaseUrl: config.api_base_url || null,
      ambiente: config.ambiente || 'homologacao',
    };

    const providerResponse = await provider.emitir(providerCtx, providerPayload);

    // ── 6. Persiste atomicamente: nota + vínculos + update pedidos ──────────
    const notaData = this.mapper.mapProviderResponseToNotaInsert({
      providerResponse,
      preview,
      userId,
      observacoesFiscais: input.observacoesFiscais,
      idempotencyKey,
    });

    const notaRow = await this.repo.emitirNotaAtomico({
      notaData: notaData as Record<string, unknown>,
      pedidoIds,
      valorTotal: preview.valorTotal,
      usuarioId: userId,
      correlationId,
    });

    if (faturaId) await this.repo.updateFaturaNota(faturaId, Number(notaRow['id']));

    // ── 7. Auditoria (fire-and-forget) ─────────────────────────────────────
    const statusNovo = mapProviderStatus(providerResponse.status);
    void this.audit.registrarEmissao({
      notaFiscalId: Number(notaRow['id']),
      statusAnterior: NotaFiscalStatus.PENDENTE,
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

    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;

    const providerStatus = await provider.consultarStatus(
      {
        accessToken: authResult.accessToken,
        apiBaseUrl: config.api_base_url || null,
        ambiente: config.ambiente || 'homologacao',
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

    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;

    const providerResp = await provider.cancelar(
      {
        accessToken: authResult.accessToken,
        apiBaseUrl: config.api_base_url || null,
        ambiente: config.ambiente || 'homologacao',
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

  async getXmlUrl(id: number) {
    const nota = await this.repo.getNotaById(id);
    if (nota.xml_url) return nota.xml_url as string;

    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return null;

    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;
    const result = await provider.baixarXml(
      { accessToken: authResult.accessToken, apiBaseUrl: config.api_base_url || null, ambiente: config.ambiente || 'homologacao' },
      externalId,
    );
    return result.xmlUrl;
  }

  async getPdfUrl(id: number) {
    const nota = await this.repo.getNotaById(id);
    if (nota.pdf_url) return nota.pdf_url as string;

    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return null;

    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const authResult = await this.auth.getValidAccessToken(config as Parameters<typeof this.auth.getValidAccessToken>[0]);
    const externalId = (nota.external_id || nota.chave_acesso || String(nota.id)) as string;
    const result = await provider.baixarPdf(
      { accessToken: authResult.accessToken, apiBaseUrl: config.api_base_url || null, ambiente: config.ambiente || 'homologacao' },
      externalId,
    );
    return result.pdfUrl;
  }
}
