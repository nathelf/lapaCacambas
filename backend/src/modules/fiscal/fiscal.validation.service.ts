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
    const erros: Array<{ code: string; message: string; field?: string; details?: Record<string, unknown> }> = [];
    const alertas: string[] = [];

    if (!preview) {
      return {
        apto_para_emissao: false,
        erros: [{ code: 'PEDIDO_NOT_FOUND', message: 'Pedido(s) não encontrado(s) ou lista vazia.' }],
        alertas,
        preview: null,
      };
    }

    const pedidos = await this.repo.getPedidosByIds(preview.pedidos.map((p) => p.id));
    const config = await this.repo.getConfiguracaoFiscalAtiva(preview.empresaId);

    for (const p of pedidos) {
      if (p.status === 'cancelado') {
        erros.push({
          code: 'PEDIDO_CANCELADO',
          message: `Pedido ${p.numero} (id: ${p.id}) está cancelado e não pode ser faturado.`,
          field: 'status',
          details: { pedidoId: p.id, numero: p.numero, status: p.status },
        });
      }
      if (!['concluido', 'faturado'].includes(p.status) && !p.faturavel) {
        erros.push({
          code: 'PEDIDO_NAO_FATURAVEL',
          message: `Pedido ${p.numero} (id: ${p.id}) tem status "${p.status}" — apenas "concluido" ou "faturado" são elegíveis.`,
          field: 'status',
          details: { pedidoId: p.id, numero: p.numero, status: p.status, faturavel: p.faturavel },
        });
      }
      if (!p.servico_id) {
        erros.push({
          code: 'SERVICO_OBRIGATORIO',
          message: `Pedido ${p.numero} (id: ${p.id}) não tem serviço vinculado. Associe um serviço com código fiscal antes de emitir.`,
          field: 'servico_id',
          details: { pedidoId: p.id, numero: p.numero },
        });
      }
      const valorTotal = Number(p.valor_total || 0);
      if (valorTotal <= 0) {
        erros.push({
          code: 'VALOR_INVALIDO',
          message: `Pedido ${p.numero} (id: ${p.id}) tem valor_total = ${valorTotal.toFixed(2)} — deve ser maior que zero.`,
          field: 'valor_total',
          details: { pedidoId: p.id, numero: p.numero, valor_total: valorTotal },
        });
      }
      if (p.status_fiscal === 'emitida' || p.nota_fiscal_status === 'emitida') {
        erros.push({
          code: 'NOTA_JA_EMITIDA',
          message: `Pedido ${p.numero} (id: ${p.id}) já possui nota fiscal autorizada. Use "forcarEmissao: true" apenas se necessário.`,
          field: 'status_fiscal',
          details: { pedidoId: p.id, numero: p.numero, status_fiscal: p.status_fiscal, nota_fiscal_id: p.nota_fiscal_id },
        });
      }
    }

    // Validação de cliente único no lote
    if (preview.pedidos.length > 1) {
      const clienteIds = new Set(preview.pedidos.map((p) => p.cliente_id));
      if (clienteIds.size > 1) {
        erros.push({
          code: 'LOTE_MULTIPLOS_CLIENTES',
          message: `Lote fiscal com ${clienteIds.size} clientes diferentes não é permitido. Todos os pedidos devem ser do mesmo cliente.`,
          details: { clienteIds: Array.from(clienteIds) },
        });
      }
    }

    // Validação do cliente
    const cliente = pedidos[0]?.clientes as any;
    if (!cliente) {
      erros.push({
        code: 'CLIENTE_NOT_FOUND',
        message: `Cliente id=${pedidos[0]?.cliente_id} não encontrado.`,
        field: 'cliente_id',
      });
    } else {
      if (!(cliente.cnpj || cliente.cpf)) {
        erros.push({
          code: 'CLIENTE_DOC_INVALIDO',
          message: `Cliente "${cliente.nome}" (id: ${cliente.id}) sem CPF/CNPJ cadastrado — obrigatório para NF-e.`,
          field: 'cliente.documento',
          details: { clienteId: cliente.id, nome: cliente.nome },
        });
      }
      if (!cliente.endereco) {
        erros.push({
          code: 'DADOS_FISCAIS_MINIMOS',
          message: `Cliente "${cliente.nome}" (id: ${cliente.id}) sem endereço cadastrado — obrigatório para NF-e.`,
          field: 'cliente.endereco',
          details: { clienteId: cliente.id, nome: cliente.nome },
        });
      }
    }

    // Validação da configuração fiscal
    if (!config) {
      erros.push({
        code: 'CONFIG_FISCAL_NOT_FOUND',
        message: 'Nenhuma configuração fiscal ativa encontrada. Execute a migration de seed fiscal (supabase/migrations/20260415000000_fiscal_sprint1_hardening.sql).',
      });
    } else {
      if (!config.ambiente) {
        erros.push({
          code: 'AMBIENTE_FISCAL_INVALIDO',
          message: `Configuração fiscal id=${config.id} sem campo "ambiente" definido (homologacao|producao).`,
          field: 'ambiente',
          details: { configId: config.id },
        });
      }
      if (!config.api_key && !(config.client_id && config.client_secret)) {
        erros.push({
          code: 'CREDENCIAIS_FISCAIS_INVALIDAS',
          message: `Configuração fiscal id=${config.id} sem credenciais: defina api_key OU (client_id + client_secret).`,
          field: 'credenciais',
          details: { configId: config.id, temApiKey: !!config.api_key, temClientId: !!config.client_id },
        });
      }
    }

    // Validação de fatura vinculada
    if (preview.faturaId) {
      const fatura = await this.repo.getFaturaById(preview.faturaId);
      if (!fatura) {
        erros.push({
          code: 'FATURA_NOT_FOUND',
          message: `Fatura id=${preview.faturaId} não encontrada.`,
          field: 'faturaId',
          details: { faturaId: preview.faturaId },
        });
      }
    }

    // Alertas não bloqueantes
    if (preview.valorTotal > 100000) {
      alertas.push(`Valor total R$ ${preview.valorTotal.toFixed(2)} é elevado — revisar alíquotas e impostos antes da emissão.`);
    }
    if (!preview.servico?.codigo_fiscal) {
      alertas.push('Serviço sem código fiscal municipal definido. O campo codigo_servico_municipal ficará vazio na NF-e.');
    }
    if (preview.ambiente !== 'producao') {
      alertas.push(`Emissão em ambiente "${preview.ambiente || 'não definido'}" — nota não terá validade fiscal.`);
    }

    return {
      apto_para_emissao: erros.length === 0,
      erros,
      alertas,
      preview,
    };
  }
}

