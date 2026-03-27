import { createHash } from 'node:crypto';
import { FiscalAuthService } from './fiscal.auth.service';
import { FiscalMapper } from './fiscal.mapper';
import { FiscalRepository } from './fiscal.repository';
import type { EmitirNotaDTO } from './fiscal.types';
import { FiscalValidationService } from './fiscal.validation.service';
import { providerFactory } from './providers/provider.factory';

export class FiscalService {
  constructor(
    private readonly repo: FiscalRepository,
    private readonly validation: FiscalValidationService,
    private readonly auth: FiscalAuthService,
    private readonly mapper: FiscalMapper,
  ) {}

  async validarPedido(pedidoId: number) {
    return this.validation.validarPedidoParaEmissao(pedidoId);
  }

  async preview(pedidoIds: number[], faturaId: number | null) {
    return this.validation.validarLote(pedidoIds, faturaId);
  }

  async emitir(input: EmitirNotaDTO, userId: string) {
    const pedidoIds = input.pedidoIds.map(Number).filter((n) => Number.isFinite(n));
    const faturaId = input.faturaId ? Number(input.faturaId) : null;
    const validationResult = await this.validation.validarLote(pedidoIds, faturaId);

    if (!validationResult.apto_para_emissao && !input.forcarEmissao) {
      return {
        ok: false,
        validation: validationResult,
        nota: null,
      };
    }

    if (!validationResult.preview) {
      throw new Error('Preview fiscal não pôde ser montado.');
    }

    const preview = validationResult.preview;
    const idempotencyKey = this.buildIdempotencyKey(pedidoIds, faturaId, input.observacoesFiscais);
    const existing = await this.repo.findNotaByIdempotencyKey(idempotencyKey);
    if (existing) {
      return {
        ok: true,
        validation: validationResult,
        nota: this.mapper.mapNotaRowToResponse(existing),
        idempotent: true,
      };
    }

    const config = await this.repo.getConfiguracaoFiscalAtiva(preview.empresaId);
    if (!config) throw new Error('Configuração fiscal ativa não encontrada.');

    const auth = await this.auth.getValidAccessToken(config as any);
    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const providerPayload = this.mapper.mapPedidoPreviewToProviderPayload(preview, input.observacoesFiscais);

    const providerResponse = await provider.emitir(
      {
        accessToken: auth.accessToken,
        apiBaseUrl: config.api_base_url || null,
        ambiente: config.ambiente || 'homologacao',
      },
      { idempotencyKey, payload: providerPayload },
    );

    const notaInsert = this.mapper.mapProviderResponseToNotaInsert({
      providerResponse,
      preview,
      userId,
      observacoesFiscais: input.observacoesFiscais,
      idempotencyKey,
    });

    const nota = await this.repo.createNotaFiscal(notaInsert);
    await this.repo.linkNotaPedidos(nota.id, pedidoIds, preview.valorTotal);
    await this.repo.updatePedidosAposEmissao(pedidoIds, nota.id, nota.status);
    if (faturaId) await this.repo.updateFaturaNota(faturaId, nota.id);

    await this.repo.saveFiscalLog({
      nota_fiscal_id: nota.id,
      empresa_id: preview.empresaId,
      tipo_operacao: 'emitir_nf',
      request_payload: providerPayload,
      response_payload: providerResponse.providerResponse,
      http_status: providerResponse.status === 'erro' ? 500 : 200,
      status_integracao: providerResponse.status,
      mensagem: providerResponse.mensagem || null,
      tentativa: 1,
    });

    await this.repo.saveAuditLog({
      usuario_id: userId,
      acao: 'emissao_nf_backend',
      entidade: 'notas_fiscais',
      entidade_id: nota.id,
      dados_anteriores: null,
      dados_novos: { pedidoIds, faturaId, status: nota.status },
    });

    return {
      ok: true,
      validation: validationResult,
      nota: this.mapper.mapNotaRowToResponse(nota),
      idempotent: false,
    };
  }

  async listarNotas(filters: {
    status?: string;
    clienteId?: number;
    pedidoId?: number;
    faturaId?: number;
    limit?: number;
    offset?: number;
  }) {
    const rows = await this.repo.listNotas({
      status: filters.status,
      clienteId: filters.clienteId,
      pedidoId: filters.pedidoId,
      faturaId: filters.faturaId,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    });
    return rows.map((r) => this.mapper.mapNotaRowToResponse(r));
  }

  async detalharNota(id: number) {
    const row = await this.repo.getNotaById(id);
    return row;
  }

  async consultarStatusNota(id: number) {
    const nota = await this.repo.getNotaById(id);
    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return { local_status: nota.status, provider_status: null };

    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const auth = await this.auth.getValidAccessToken(config as any);
    const externalId = nota.external_id || nota.chave_acesso || String(nota.id);

    const providerStatus = await provider.consultarStatus(
      {
        accessToken: auth.accessToken,
        apiBaseUrl: config.api_base_url || null,
        ambiente: config.ambiente || 'homologacao',
      },
      externalId,
    );

    await this.repo.saveFiscalLog({
      nota_fiscal_id: nota.id,
      empresa_id: nota.empresa_id || null,
      tipo_operacao: 'consultar_status_nf',
      request_payload: { externalId },
      response_payload: providerStatus,
      http_status: 200,
      status_integracao: String(providerStatus.status || 'desconhecido'),
      mensagem: null,
      tentativa: 1,
    });

    return { local_status: nota.status, provider_status: providerStatus };
  }

  async cancelarNota(id: number, reason: string, userId: string) {
    const nota = await this.repo.getNotaById(id);
    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) throw new Error('Configuração fiscal ativa não encontrada.');

    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const auth = await this.auth.getValidAccessToken(config as any);
    const externalId = nota.external_id || nota.chave_acesso || String(nota.id);

    const providerResp = await provider.cancelar(
      {
        accessToken: auth.accessToken,
        apiBaseUrl: config.api_base_url || null,
        ambiente: config.ambiente || 'homologacao',
      },
      { externalId, reason },
    );

    const updated = await this.repo.cancelNota(id, reason, userId);
    await this.repo.saveFiscalLog({
      nota_fiscal_id: id,
      empresa_id: updated.empresa_id || null,
      tipo_operacao: 'cancelar_nf',
      request_payload: { reason, externalId },
      response_payload: providerResp,
      http_status: 200,
      status_integracao: 'cancelada',
      mensagem: reason,
      tentativa: 1,
    });
    return updated;
  }

  async getXmlUrl(id: number) {
    const nota = await this.repo.getNotaById(id);
    if (nota.xml_url) return nota.xml_url as string;
    const config = await this.repo.getConfiguracaoFiscalAtiva((nota.empresa_id as string | null) || null);
    if (!config) return null;
    const provider = providerFactory(config.provedor_fiscal || 'mock');
    const auth = await this.auth.getValidAccessToken(config as any);
    const externalId = nota.external_id || nota.chave_acesso || String(nota.id);
    const result = await provider.baixarXml(
      { accessToken: auth.accessToken, apiBaseUrl: config.api_base_url || null, ambiente: config.ambiente || 'homologacao' },
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
    const auth = await this.auth.getValidAccessToken(config as any);
    const externalId = nota.external_id || nota.chave_acesso || String(nota.id);
    const result = await provider.baixarPdf(
      { accessToken: auth.accessToken, apiBaseUrl: config.api_base_url || null, ambiente: config.ambiente || 'homologacao' },
      externalId,
    );
    return result.pdfUrl;
  }

  private buildIdempotencyKey(pedidoIds: number[], faturaId: number | null, observacoes?: string) {
    const base = JSON.stringify({
      pedidoIds: [...pedidoIds].sort((a, b) => a - b),
      faturaId,
      observacoes: observacoes || '',
    });
    return `nf_${createHash('sha256').update(base).digest('hex').slice(0, 32)}`;
  }
}

