import { createHash } from 'node:crypto';
import { env } from '../../config/env';
import { BancoAuthService } from './banco.auth.service';
import { BancoMapper } from './banco.mapper';
import { BoletoRepository } from './boleto.repository';
import type { CriarBoletoDTO } from './boleto.types';
import { BoletoValidationService } from './boleto.validation.service';
import { bancoProviderFactory } from './providers/banco-provider.factory';

export class BoletoService {
  constructor(
    private readonly repo: BoletoRepository,
    private readonly validation: BoletoValidationService,
    private readonly auth: BancoAuthService,
    private readonly mapper: BancoMapper,
  ) {}

  async criar(dto: CriarBoletoDTO, userId: string) {
    const v = await this.validation.validateCriacao(dto);
    if (!v.apto_para_emissao) return { ok: false, validation: v, boleto: null };
    const row = await this.repo.createBoleto(this.mapper.toBoletoInsert(dto, userId));
    await this.repo.saveAuditLog({
      usuario_id: userId,
      acao: 'criacao_boleto',
      entidade: 'boletos',
      entidade_id: row.id,
      dados_novos: row,
    });
    return { ok: true, validation: v, boleto: row };
  }

  async emitir(boletoId: number, userId: string) {
    const boleto = await this.repo.getBoleto(boletoId);
    if (!boleto) throw new Error('Boleto não encontrado.');
    if (boleto.status === 'pago') throw new Error('Boleto já está pago.');
    if (boleto.status === 'cancelado') throw new Error('Boleto cancelado não pode ser emitido novamente.');
    if (boleto.integracao_status === 'sucesso' && boleto.external_id) {
      return { ok: true, idempotent: true, boleto };
    }

    const cliente = await this.repo.getCliente(boleto.cliente_id);
    const pedido = boleto.pedido_id ? await this.repo.getPedido(boleto.pedido_id) : null;
    const fatura = boleto.fatura_id ? await this.repo.getFatura(boleto.fatura_id) : null;
    const { auth, config } = await this.auth.getValidAccessToken(null);
    const provider = bancoProviderFactory(config.provedor_bancario);

    const idempotency = this.idempotencyKey(boleto.id, boleto.cliente_id, boleto.valor, boleto.data_vencimento);
    const providerPayload = this.mapper.toProviderPayload({ boleto, cliente, pedido, fatura });

    await this.repo.updateBoleto(boleto.id, { integracao_status: 'processando', status: 'pendente' });
    await this.repo.saveBancoLog({
      boleto_id: boleto.id,
      empresa_id: config.empresa_id,
      tipo_operacao: 'emissao',
      request_payload: providerPayload,
      response_payload: { step: 'start' },
      http_status: 100,
      status_integracao: 'processando',
      tentativa: 1,
    });

    try {
      const resp = await provider.emitirBoleto(
        {
          accessToken: auth.accessToken,
          apiBaseUrl: config.api_base_url,
          ambiente: config.ambiente,
          bancoNome: config.banco_nome,
        },
        providerPayload,
        idempotency,
      );

      const updated = await this.repo.updateBoleto(boleto.id, {
        status: resp.status === 'erro' ? 'erro' : 'emitido',
        integracao_status: resp.status === 'erro' ? 'erro' : 'sucesso',
        external_id: resp.externalId,
        nosso_numero: resp.nossoNumero,
        linha_digitavel: resp.linhaDigitavel,
        codigo_barras: resp.codigoBarras,
        pdf_url: resp.pdfUrl,
        payload_envio: resp.providerRequest,
        payload_retorno: resp.providerResponse,
        mensagem_erro: resp.status === 'erro' ? (resp.mensagem || 'Falha na emissão') : null,
      });

      if (updated.fatura_id) await this.repo.updateFaturaByBoleto(updated, 'aberta');
      if (updated.pedido_id) await this.repo.updatePedidoFinanceiroStatus(updated.pedido_id, 'boleto_emitido');

      await this.repo.saveBancoLog({
        boleto_id: boleto.id,
        empresa_id: config.empresa_id,
        tipo_operacao: 'emissao',
        request_payload: providerPayload,
        response_payload: resp.providerResponse,
        http_status: resp.status === 'erro' ? 500 : 200,
        status_integracao: resp.status === 'erro' ? 'erro' : 'sucesso',
        mensagem: resp.mensagem || null,
        tentativa: 1,
      });

      await this.repo.saveAuditLog({
        usuario_id: userId,
        acao: 'emissao_boleto_backend',
        entidade: 'boletos',
        entidade_id: updated.id,
        dados_novos: { status: updated.status, external_id: updated.external_id },
      });

      return { ok: true, idempotent: false, boleto: updated };
    } catch (err: any) {
      const msg = err?.message || 'Erro ao emitir boleto no provider.';
      const erro = await this.repo.updateBoleto(boleto.id, {
        status: 'erro',
        integracao_status: 'erro',
        mensagem_erro: msg,
      });
      await this.repo.saveBancoLog({
        boleto_id: boleto.id,
        empresa_id: config.empresa_id,
        tipo_operacao: 'emissao',
        request_payload: providerPayload,
        response_payload: { error: msg },
        http_status: 500,
        status_integracao: 'erro',
        mensagem: msg,
        tentativa: 1,
      });
      return { ok: false, idempotent: false, boleto: erro, message: msg };
    }
  }

  async listar(filters: { status?: string; clienteId?: number; pedidoId?: number; faturaId?: number; limit?: number; offset?: number }) {
    return this.repo.listBoletos({
      ...filters,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    });
  }

  async detalhar(id: number) {
    return this.repo.getBoleto(id);
  }

  async consultarStatus(id: number) {
    const boleto = await this.repo.getBoleto(id);
    if (!boleto) throw new Error('Boleto não encontrado.');
    if (!boleto.external_id) return { local_status: boleto.status, provider_status: null };

    const { auth, config } = await this.auth.getValidAccessToken(null);
    const provider = bancoProviderFactory(config.provedor_bancario);
    const providerStatus = await provider.consultarBoleto(
      {
        accessToken: auth.accessToken,
        apiBaseUrl: config.api_base_url,
        ambiente: config.ambiente,
        bancoNome: config.banco_nome,
      },
      boleto.external_id,
    );

    const normalized = this.normalizeProviderStatus(String(providerStatus.status || 'pendente'));
    const updated = await this.repo.updateBoleto(boleto.id, {
      status: normalized.status,
      integracao_status: normalized.integracao,
      payload_retorno: providerStatus,
      data_pagamento: normalized.status === 'pago' ? (providerStatus.data_pagamento || new Date().toISOString().split('T')[0]) : boleto.data_pagamento,
    });

    if (updated.status === 'pago') {
      await this.repo.updateFaturaByBoleto(updated, 'paga');
      await this.repo.updatePedidoFinanceiroStatus(updated.pedido_id, 'pago');
    } else if (updated.status === 'vencido') {
      await this.repo.updateFaturaByBoleto(updated, 'vencida');
      await this.repo.updatePedidoFinanceiroStatus(updated.pedido_id, 'inadimplente');
    }

    return { local_status: updated.status, provider_status: providerStatus };
  }

  async cancelar(id: number, reason: string, userId: string) {
    const boleto = await this.repo.getBoleto(id);
    if (!boleto) throw new Error('Boleto não encontrado.');
    if (!boleto.external_id) {
      const local = await this.repo.updateBoleto(id, { status: 'cancelado', integracao_status: 'erro', mensagem_erro: reason });
      await this.repo.updateFaturaByBoleto(local, 'cancelada');
      return local;
    }
    const { auth, config } = await this.auth.getValidAccessToken(null);
    const provider = bancoProviderFactory(config.provedor_bancario);
    const resp = await provider.cancelarBoleto(
      { accessToken: auth.accessToken, apiBaseUrl: config.api_base_url, ambiente: config.ambiente, bancoNome: config.banco_nome },
      boleto.external_id,
      reason,
    );
    const updated = await this.repo.updateBoleto(id, {
      status: 'cancelado',
      integracao_status: 'sucesso',
      payload_retorno: resp,
      mensagem_erro: reason,
    });
    await this.repo.updateFaturaByBoleto(updated, 'cancelada');
    await this.repo.saveAuditLog({
      usuario_id: userId,
      acao: 'cancelamento_boleto_backend',
      entidade: 'boletos',
      entidade_id: id,
      dados_novos: { status: 'cancelado', motivo: reason },
    });
    return updated;
  }

  async webhookPagamento(body: Record<string, unknown>, signature: string | null) {
    if (env.bancoWebhookSecret) {
      if (!signature || signature !== env.bancoWebhookSecret) {
        throw new Error('Webhook bancário com assinatura inválida.');
      }
    }
    const externalId = String(body.external_id || body.id || '');
    if (!externalId) throw new Error('Webhook sem external_id.');
    const target = await this.repo.getBoletoByExternalId(externalId);
    if (!target) throw new Error('Boleto do webhook não encontrado.');

    const updated = await this.repo.updateBoleto(target.id, {
      status: 'pago',
      integracao_status: 'sucesso',
      data_pagamento: String(body.data_pagamento || new Date().toISOString().split('T')[0]),
      payload_retorno: body,
    });
    await this.repo.updateFaturaByBoleto(updated, 'paga');
    await this.repo.updatePedidoFinanceiroStatus(updated.pedido_id, 'pago');
    await this.repo.saveBancoLog({
      boleto_id: updated.id,
      empresa_id: null,
      tipo_operacao: 'webhook',
      request_payload: body,
      response_payload: { accepted: true },
      http_status: 200,
      status_integracao: 'sucesso',
      mensagem: 'Pagamento confirmado por webhook.',
      tentativa: 1,
    });
    return { ok: true, boleto_id: updated.id };
  }

  private idempotencyKey(boletoId: number, clienteId: number, valor: number, vencimento: string) {
    const b = `${boletoId}|${clienteId}|${valor}|${vencimento}`;
    return `bol_${createHash('sha256').update(b).digest('hex').slice(0, 32)}`;
  }

  private normalizeProviderStatus(status: string): { status: string; integracao: string } {
    const s = status.toLowerCase();
    if (s.includes('paid') || s.includes('pago')) return { status: 'pago', integracao: 'sucesso' };
    if (s.includes('overdue') || s.includes('vencido')) return { status: 'vencido', integracao: 'sucesso' };
    if (s.includes('cancel')) return { status: 'cancelado', integracao: 'sucesso' };
    if (s.includes('error') || s.includes('erro')) return { status: 'erro', integracao: 'erro' };
    return { status: 'emitido', integracao: 'sucesso' };
  }
}

