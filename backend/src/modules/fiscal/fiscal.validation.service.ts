import { FiscalRepository } from './fiscal.repository';
import type { FiscalPreviewDTO, FiscalValidationResultDTO } from './fiscal.types';

export class FiscalValidationService {
  constructor(private readonly repo: FiscalRepository) {}

  async validarPedidoParaEmissao(pedidoId: number): Promise<FiscalValidationResultDTO> {
    const preview = await this.mountPreview([pedidoId], null);
    return this.validarPreview(preview);
  }

  async validarLote(pedidoIds: number[], faturaId: number | null): Promise<FiscalValidationResultDTO> {
    const preview = await this.mountPreview(pedidoIds, faturaId);
    return this.validarPreview(preview);
  }

  private async mountPreview(pedidoIds: number[], faturaId: number | null): Promise<FiscalPreviewDTO | null> {
    if (pedidoIds.length === 0) return null;

    const pedidos = await this.repo.getPedidosByIds(pedidoIds);
    if (!pedidos.length) return null;

    const cliente = pedidos[0].clientes;
    const servico = pedidos[0].servicos ?? null;
    const config = await this.repo.getConfiguracaoFiscalAtiva(null);
    const valorTotal = pedidos.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

    return {
      empresaId: config?.empresa_id ?? null,
      pedidos: pedidos.map((p) => ({
        id: p.id,
        numero: p.numero,
        valor: Number(p.valor_total || 0),
        cliente_id: p.cliente_id,
        obra_id: p.obra_id,
        servico_id: p.servico_id,
      })),
      faturaId,
      cliente: {
        id: cliente?.id,
        nome: cliente?.nome || '',
        documento: (cliente?.cnpj || cliente?.cpf || null) as string | null,
        tipo: cliente?.cnpj ? 'PJ' : 'PF',
        email: cliente?.email || null,
        telefone: cliente?.telefone || cliente?.celular || null,
      },
      servico: servico
        ? {
            id: servico.id,
            descricao: servico.descricao,
            codigo_fiscal: servico.codigo_fiscal,
            aliquota: Number(servico.aliquota || 0),
          }
        : null,
      valorTotal,
      ambiente: config?.ambiente || '',
    };
  }

  private async validarPreview(preview: FiscalPreviewDTO | null): Promise<FiscalValidationResultDTO> {
    const erros: Array<{ code: string; message: string; field?: string }> = [];
    const alertas: string[] = [];

    if (!preview) {
      return {
        apto_para_emissao: false,
        erros: [{ code: 'PEDIDO_NOT_FOUND', message: 'Pedido não encontrado.' }],
        alertas,
        preview: null,
      };
    }

    const pedidos = await this.repo.getPedidosByIds(preview.pedidos.map((p) => p.id));
    const config = await this.repo.getConfiguracaoFiscalAtiva(preview.empresaId);

    for (const p of pedidos) {
      if (p.status === 'cancelado') erros.push({ code: 'PEDIDO_CANCELADO', message: `Pedido ${p.numero} está cancelado.` });
      if (!['concluido', 'faturado'].includes(p.status) && !p.faturavel) {
        erros.push({ code: 'PEDIDO_NAO_FATURAVEL', message: `Pedido ${p.numero} não está concluído/faturável.` });
      }
      if (!p.servico_id) erros.push({ code: 'SERVICO_OBRIGATORIO', message: `Pedido ${p.numero} sem serviço.` });
      if (Number(p.valor_total || 0) <= 0) erros.push({ code: 'VALOR_INVALIDO', message: `Pedido ${p.numero} com valor inválido.` });
      if (p.status_fiscal === 'emitida' || p.nota_fiscal_status === 'emitida') {
        erros.push({ code: 'NOTA_JA_EMITIDA', message: `Pedido ${p.numero} já possui nota autorizada.` });
      }
    }

    const cliente = pedidos[0]?.clientes;
    if (!cliente) erros.push({ code: 'CLIENTE_NOT_FOUND', message: 'Cliente não encontrado.' });
    if (cliente && !(cliente.cnpj || cliente.cpf)) {
      erros.push({ code: 'CLIENTE_DOC_INVALIDO', message: 'Cliente sem CPF/CNPJ válido.' });
    }
    if (cliente && !cliente.endereco) {
      erros.push({ code: 'DADOS_FISCAIS_MINIMOS', message: 'Cliente sem endereço fiscal mínimo.' });
    }

    if (!config) {
      erros.push({ code: 'CONFIG_FISCAL_NOT_FOUND', message: 'Configuração fiscal ativa não encontrada.' });
    } else {
      if (!config.ambiente) erros.push({ code: 'AMBIENTE_FISCAL_INVALIDO', message: 'Ambiente fiscal não definido.' });
      if (!config.api_key && !(config.client_id && config.client_secret)) {
        erros.push({ code: 'CREDENCIAIS_FISCAIS_INVALIDAS', message: 'Credenciais fiscais mínimas ausentes.' });
      }
    }

    if (preview.pedidos.length > 1) {
      const clienteIds = new Set(preview.pedidos.map((p) => p.cliente_id));
      if (clienteIds.size > 1) {
        erros.push({ code: 'LOTE_MULTIPLOS_CLIENTES', message: 'Lote fiscal com múltiplos clientes não é permitido.' });
      }
    }

    if (preview.faturaId) {
      const fatura = await this.repo.getFaturaById(preview.faturaId);
      if (!fatura) erros.push({ code: 'FATURA_NOT_FOUND', message: 'Fatura não encontrada.' });
    }

    if (preview.valorTotal > 100000) {
      alertas.push('Valor total elevado; revisar impostos antes da emissão.');
    }

    return {
      apto_para_emissao: erros.length === 0,
      erros,
      alertas,
      preview,
    };
  }
}

