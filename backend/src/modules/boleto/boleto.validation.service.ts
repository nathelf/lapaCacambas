import type { BoletoValidationResultDTO, CriarBoletoDTO } from './boleto.types';
import { BoletoRepository } from './boleto.repository';

export class BoletoValidationService {
  constructor(private readonly repo: BoletoRepository) {}

  async validateCriacao(input: CriarBoletoDTO): Promise<BoletoValidationResultDTO> {
    const erros: BoletoValidationResultDTO['erros'] = [];
    const alertas: string[] = [];

    const config = await this.repo.getConfiguracaoAtiva(null);
    if (!config) erros.push({ code: 'CONFIG_BANCARIA_AUSENTE', message: 'Configuração bancária ativa não encontrada.' });

    if (input.valor <= 0) erros.push({ code: 'VALOR_INVALIDO', message: 'Valor deve ser maior que zero.', field: 'valor' });
    if (!input.data_vencimento) erros.push({ code: 'VENCIMENTO_OBRIGATORIO', message: 'Vencimento obrigatório.', field: 'data_vencimento' });
    if (input.data_vencimento && new Date(input.data_vencimento).getTime() < Date.now() - 86400000) {
      erros.push({ code: 'VENCIMENTO_INVALIDO', message: 'Vencimento no passado não permitido.', field: 'data_vencimento' });
    }

    const cliente = await this.repo.getCliente(input.cliente_id);
    if (!cliente) erros.push({ code: 'CLIENTE_NAO_ENCONTRADO', message: 'Cliente não encontrado.' });
    else if (!cliente.cnpj && !cliente.cpf) erros.push({ code: 'CLIENTE_DOC_INVALIDO', message: 'Cliente sem documento válido (CPF/CNPJ).' });

    if (input.pedido_id) {
      const pedido = await this.repo.getPedido(input.pedido_id);
      if (!pedido) erros.push({ code: 'PEDIDO_NAO_ENCONTRADO', message: 'Pedido não encontrado.' });
      else if (pedido.status === 'cancelado') erros.push({ code: 'PEDIDO_CANCELADO', message: 'Pedido cancelado não pode gerar boleto.' });
    }

    if (input.fatura_id) {
      const fatura = await this.repo.getFatura(input.fatura_id);
      if (!fatura) erros.push({ code: 'FATURA_NAO_ENCONTRADA', message: 'Fatura não encontrada.' });
      else if (fatura.status === 'cancelada') erros.push({ code: 'FATURA_CANCELADA', message: 'Fatura cancelada não pode gerar boleto.' });
    }

    const duplicado = await this.repo.existsBoletoAtivoByRef({
      pedidoId: input.pedido_id || null,
      faturaId: input.fatura_id || null,
    });
    if (duplicado) erros.push({ code: 'BOLETO_DUPLICADO', message: 'Já existe boleto ativo para este pedido/fatura.' });

    if (input.valor >= 50000) alertas.push('Valor elevado; confirmar regras de cobrança antes de emitir.');
    return { apto_para_emissao: erros.length === 0, erros, alertas };
  }
}

